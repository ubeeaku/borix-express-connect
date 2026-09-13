import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// ---------------------------------------------------------
// Find an existing Supabase Auth user by email
// ---------------------------------------------------------

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(
        `Unable to check existing authentication accounts: ${error.message}`,
      );
    }

    const users = data.users || [];

    const matchingUser = users.find(
      (user) =>
        user.email?.trim().toLowerCase() === email,
    );

    if (matchingUser) {
      return matchingUser;
    }

    if (users.length < perPage) {
      return null;
    }

    page++;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed.",
      },
      405,
    );
  }

  try {
    // ---------------------------------------------------------
    // Supabase environment variables
    // ---------------------------------------------------------

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error:
            "Supabase environment variables are not configured.",
        },
        500,
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // ---------------------------------------------------------
    // Verify authenticated user
    // ---------------------------------------------------------

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          error: "Missing authorization header.",
        },
        401,
      );
    }

    const token = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: "Missing access token.",
        },
        401,
      );
    }

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "Authentication verification failed:",
        userError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Invalid or expired authentication token.",
        },
        401,
      );
    }

    // ---------------------------------------------------------
    // Verify administrator
    // ---------------------------------------------------------

    const {
      data: isAdmin,
      error: adminError,
    } = await supabaseAdmin.rpc("is_admin", {
      _user_id: user.id,
    });

    if (adminError) {
      console.error(
        "Admin verification failed:",
        adminError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to verify administrator access.",
        },
        500,
      );
    }

    if (!isAdmin) {
      return jsonResponse(
        {
          success: false,
          error:
            "Administrator access required.",
        },
        403,
      );
    }

    // ---------------------------------------------------------
    // Parse request
    // ---------------------------------------------------------

    let body: {
      applicationId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid request body.",
        },
        400,
      );
    }

    const applicationId =
      body.applicationId?.trim();

    if (!applicationId) {
      return jsonResponse(
        {
          success: false,
          error:
            "Application ID is required.",
        },
        400,
      );
    }

    // ---------------------------------------------------------
    // Get driver application
    // ---------------------------------------------------------

    const {
      data: application,
      error: applicationError,
    } = await supabaseAdmin
      .from("driver_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (applicationError || !application) {
      console.error(
        "Failed to find driver application:",
        applicationError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Driver application not found.",
        },
        404,
      );
    }

    // ---------------------------------------------------------
    // Validate application status
    // ---------------------------------------------------------

    if (
      application.status !== "pending" &&
      application.status !== "approved" &&
      application.status !== "suspended" &&
      application.status !== "rejected"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "This application cannot be approved from its current status.",
        },
        400,
      );
    }

    // ---------------------------------------------------------
    // Validate park
    // ---------------------------------------------------------

    if (!application.park_id) {
      return jsonResponse(
        {
          success: false,
          error:
            "This application does not have a park assigned. Please assign a park before approving the driver.",
        },
        400,
      );
    }

    // ---------------------------------------------------------
    // Validate email
    // ---------------------------------------------------------

    const email =
      application.email
        ?.trim()
        .toLowerCase();

    if (!email) {
      return jsonResponse(
        {
          success: false,
          error:
            "This driver application does not have an email address. Please update the application before approving.",
        },
        400,
      );
    }

    // ---------------------------------------------------------
    // Check existing driver record
    // ---------------------------------------------------------

    const {
      data: existingDriver,
      error: existingDriverError,
    } = await supabaseAdmin
      .from("drivers")
      .select("*")
      .eq("application_id", applicationId)
      .maybeSingle();

    if (existingDriverError) {
      console.error(
        "Failed to check existing driver:",
        existingDriverError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to check existing driver account.",
        },
        500,
      );
    }

    // =========================================================
    // CASE 1:
    // Existing driver record already has a user_id.
    //
    // Reuse and reactivate the existing account.
    // This covers:
    // - suspended drivers
    // - rejected applications
    // - approved drivers
    // =========================================================

    if (existingDriver?.user_id) {
      const existingUserId =
        existingDriver.user_id;

      // -------------------------------------------------------
      // Make sure the Auth user still exists
      // -------------------------------------------------------

      const {
        data: existingUserData,
        error: existingUserError,
      } = await supabaseAdmin.auth.admin.getUserById(
        existingUserId,
      );

      if (
        existingUserError ||
        !existingUserData.user
      ) {
        console.error(
          "Existing driver references a missing Auth user:",
          existingUserError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "This driver record references an Auth account that no longer exists. Please contact an administrator before approving this driver.",
          },
          409,
        );
      }

      // -------------------------------------------------------
      // Restore driver role
      // -------------------------------------------------------

      const {
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id: existingUserId,
            role: "driver",
          },
          {
            onConflict:
              "user_id,role",
          },
        );

      if (roleError) {
        console.error(
          "Failed to restore driver role:",
          roleError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing driver account was found, but the driver role could not be restored.",
          },
          500,
        );
      }

      // -------------------------------------------------------
      // Reactivate the Auth account
      //
      // If suspension previously used a Supabase Auth ban,
      // remove that ban.
      // -------------------------------------------------------

      const {
        error: unbanError,
      } = await supabaseAdmin.auth.admin.updateUserById(
        existingUserId,
        {
          ban_duration: "none",
        },
      );

      if (unbanError) {
        console.error(
          "Failed to reactivate Auth account:",
          unbanError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing driver account was found, but the authentication account could not be reactivated.",
          },
          500,
        );
      }

      // -------------------------------------------------------
      // Reactivate driver record
      // -------------------------------------------------------

      const {
        data: updatedDriver,
        error: updateDriverError,
      } = await supabaseAdmin
        .from("drivers")
        .update({
          user_id: existingUserId,
          application_id: applicationId,
          full_name: application.full_name,
          phone: application.phone,
          email,
          park_id: application.park_id,
          status: "active",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", existingDriver.id)
        .select("id")
        .single();

      if (
        updateDriverError ||
        !updatedDriver
      ) {
        console.error(
          "Failed to reactivate existing driver:",
          updateDriverError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing driver account was found, but the driver record could not be reactivated.",
          },
          500,
        );
      }

      // -------------------------------------------------------
      // Approve application
      // -------------------------------------------------------

      const {
        error: approvalError,
      } = await supabaseAdmin
        .from("driver_applications")
        .update({
          status: "approved",
        })
        .eq("id", applicationId);

      if (approvalError) {
        console.error(
          "Driver was reactivated but application approval failed:",
          approvalError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing driver account was reactivated, but the application could not be marked as approved. Please retry the approval.",
          },
          500,
        );
      }

      return jsonResponse({
        success: true,
        alreadyExists: true,
        reactivated: true,
        driverId: updatedDriver.id,
        userId: existingUserId,
        email:
          existingDriver.email ||
          email,
        message:
          "Existing driver account was found and reactivated successfully. No new account was created.",
      });
    }

    // =========================================================
    // CASE 2:
    // Driver record exists but has NO user_id.
    //
    // Check whether an Auth account already exists using email.
    // =========================================================

    let existingAuthUser = null;

    try {
      existingAuthUser =
        await findAuthUserByEmail(
          supabaseAdmin,
          email,
        );
    } catch (error) {
      console.error(
        "Failed to search for existing Auth account:",
        error,
      );

      return jsonResponse(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to check existing authentication account.",
        },
        500,
      );
    }

    // ---------------------------------------------------------
    // Existing Auth account found
    // ---------------------------------------------------------

    if (existingAuthUser) {
      const existingUserId =
        existingAuthUser.id;

      // -------------------------------------------------------
      // Check whether this Auth account belongs to another
      // driver.
      // -------------------------------------------------------

      const {
        data: otherDriver,
        error: otherDriverError,
      } = await supabaseAdmin
        .from("drivers")
        .select("id, application_id, full_name, email")
        .eq("user_id", existingUserId)
        .maybeSingle();

      if (otherDriverError) {
        console.error(
          "Failed to check Auth account ownership:",
          otherDriverError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Unable to verify ownership of the existing driver account.",
          },
          500,
        );
      }

      if (
        otherDriver &&
        otherDriver.id !== existingDriver?.id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "An account with this email already exists and is already linked to another driver. Please check the existing driver account before approving this application.",
          },
          409,
        );
      }

      // -------------------------------------------------------
      // Restore driver role
      // -------------------------------------------------------

      const {
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id: existingUserId,
            role: "driver",
          },
          {
            onConflict:
              "user_id,role",
          },
        );

      if (roleError) {
        console.error(
          "Failed to assign driver role:",
          roleError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing account was found, but the driver role could not be assigned.",
          },
          500,
        );
      }

      // -------------------------------------------------------
      // Remove any Auth suspension/ban
      // -------------------------------------------------------

      const {
        error: unbanError,
      } = await supabaseAdmin.auth.admin.updateUserById(
        existingUserId,
        {
          ban_duration: "none",
        },
      );

      if (unbanError) {
        console.error(
          "Failed to reactivate existing Auth account:",
          unbanError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing account was found, but it could not be reactivated.",
          },
          500,
        );
      }

      // -------------------------------------------------------
      // Link existing Auth account to driver
      // -------------------------------------------------------

      let driverId: string;

      if (existingDriver) {
        const {
          data: linkedDriver,
          error: linkError,
        } = await supabaseAdmin
          .from("drivers")
          .update({
            user_id: existingUserId,
            application_id: applicationId,
            full_name: application.full_name,
            phone: application.phone,
            email,
            park_id: application.park_id,
            status: "active",
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", existingDriver.id)
          .select("id")
          .single();

        if (
          linkError ||
          !linkedDriver
        ) {
          console.error(
            "Failed to link existing Auth account:",
            linkError,
          );

          return jsonResponse(
            {
              success: false,
              error:
                "The existing account was found, but it could not be linked to this driver.",
            },
            500,
          );
        }

        driverId = linkedDriver.id;
      } else {
        const {
          data: newDriver,
          error: driverError,
        } = await supabaseAdmin
          .from("drivers")
          .insert({
            user_id: existingUserId,
            application_id: applicationId,
            full_name: application.full_name,
            phone: application.phone,
            email,
            park_id: application.park_id,
            status: "active",
          })
          .select("id")
          .single();

        if (
          driverError ||
          !newDriver
        ) {
          console.error(
            "Failed to create driver record:",
            driverError,
          );

          return jsonResponse(
            {
              success: false,
              error:
                "The existing account was found, but the driver record could not be created.",
            },
            500,
          );
        }

        driverId = newDriver.id;
      }

      // -------------------------------------------------------
      // Approve application
      // -------------------------------------------------------

      const {
        error: approvalError,
      } = await supabaseAdmin
        .from("driver_applications")
        .update({
          status: "approved",
        })
        .eq("id", applicationId);

      if (approvalError) {
        console.error(
          "Existing account was linked but application approval failed:",
          approvalError,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "The existing driver account was linked successfully, but the application could not be marked as approved. Please retry the approval.",
          },
          500,
        );
      }

      return jsonResponse({
        success: true,
        alreadyExists: true,
        reactivated: true,
        linkedExistingAccount: true,
        driverId,
        userId: existingUserId,
        email,
        message:
          "Existing authentication account was found, linked to the driver, and reactivated successfully. No new account was created.",
      });
    }

    // =========================================================
    // CASE 3:
    // No existing Auth account.
    //
    // Create a brand-new driver account.
    // =========================================================

    const temporaryPassword =
      `${crypto.randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)}B!9`;

    const {
      data: createdUserData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name:
          application.full_name,
        phone:
          application.phone,
        role: "driver",
      },
    });

    if (
      createUserError ||
      !createdUserData.user
    ) {
      console.error(
        "Failed to create driver Auth account:",
        createUserError,
      );

      // This can happen if another account was created
      // between our search and this create request.
      if (
        createUserError?.message
          ?.toLowerCase()
          .includes("already")
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "An account with this email already exists. Please retry the approval so the existing account can be linked.",
          },
          409,
        );
      }

      return jsonResponse(
        {
          success: false,
          error:
            createUserError?.message ||
            "Failed to create driver authentication account.",
        },
        500,
      );
    }

    const userId =
      createdUserData.user.id;

    // ---------------------------------------------------------
    // Assign driver role
    // ---------------------------------------------------------

    const {
      error: roleError,
    } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: "driver",
        },
        {
          onConflict:
            "user_id,role",
        },
      );

    if (roleError) {
      console.error(
        "Failed to assign driver role:",
        roleError,
      );

      await supabaseAdmin.auth.admin.deleteUser(
        userId,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Driver account was created, but the driver role could not be assigned.",
        },
        500,
      );
    }

    // ---------------------------------------------------------
    // Create or update driver record
    // ---------------------------------------------------------

    let driverId: string;

    if (existingDriver) {
      const {
        data: updatedDriver,
        error: updateDriverError,
      } = await supabaseAdmin
        .from("drivers")
        .update({
          user_id: userId,
          application_id: applicationId,
          full_name:
            application.full_name,
          phone:
            application.phone,
          email,
          park_id:
            application.park_id,
          status: "active",
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", existingDriver.id)
        .select("id")
        .single();

      if (
        updateDriverError ||
        !updatedDriver
      ) {
        console.error(
          "Failed to update driver record:",
          updateDriverError,
        );

        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Driver account was created, but the driver record could not be updated.",
          },
          500,
        );
      }

      driverId =
        updatedDriver.id;
    } else {
      const {
        data: newDriver,
        error: driverError,
      } = await supabaseAdmin
        .from("drivers")
        .insert({
          user_id: userId,
          application_id:
            applicationId,
          full_name:
            application.full_name,
          phone:
            application.phone,
          email,
          park_id:
            application.park_id,
          status: "active",
        })
        .select("id")
        .single();

      if (
        driverError ||
        !newDriver
      ) {
        console.error(
          "Failed to create driver record:",
          driverError,
        );

        await supabaseAdmin.auth.admin.deleteUser(
          userId,
        );

        return jsonResponse(
          {
            success: false,
            error:
              "Driver account was created, but the driver record could not be created.",
          },
          500,
        );
      }

      driverId = newDriver.id;
    }

    // ---------------------------------------------------------
    // Approve application
    // ---------------------------------------------------------

    const {
      error: approvalError,
    } = await supabaseAdmin
      .from("driver_applications")
      .update({
        status: "approved",
      })
      .eq("id", applicationId);

    if (approvalError) {
      console.error(
        "Driver account was created but application approval failed:",
        approvalError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Driver account was created successfully, but the application could not be marked as approved. Please retry the approval.",
        },
        500,
      );
    }

    // ---------------------------------------------------------
    // Success
    // ---------------------------------------------------------

    return jsonResponse({
      success: true,
      alreadyExists: false,
      reactivated: false,
      linkedExistingAccount: false,
      driverId,
      userId,
      email,
      temporaryPassword,
      message:
        "Driver account created and application approved successfully.",
    });
  } catch (error) {
    console.error(
      "Unexpected create-driver-account error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      },
      500,
    );
  }
});