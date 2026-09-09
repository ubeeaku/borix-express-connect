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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          error: "Supabase environment variables are not configured.",
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
    // Verify the authenticated user
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

    const token = authHeader.replace("Bearer ", "").trim();

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
          error: "Invalid or expired authentication token.",
        },
        401,
      );
    }

    // ---------------------------------------------------------
    // Verify that the user is an admin
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
          error: "Unable to verify administrator access.",
        },
        500,
      );
    }

    if (!isAdmin) {
      return jsonResponse(
        {
          success: false,
          error: "Administrator access required.",
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

    const applicationId = body.applicationId?.trim();

    if (!applicationId) {
      return jsonResponse(
        {
          success: false,
          error: "Application ID is required.",
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
          error: "Driver application not found.",
        },
        404,
      );
    }

    // ---------------------------------------------------------
    // Validate application status
    // ---------------------------------------------------------

    if (
      application.status !== "pending" &&
      application.status !== "approved"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Only pending or already-approved applications can have a driver account created.",
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

    const email = application.email?.trim().toLowerCase();

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
    // Check whether a driver record already exists
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
          error: "Unable to check existing driver account.",
        },
        500,
      );
    }

    // If the driver already has an account and the application is
    // approved, don't create another account.
    if (
      existingDriver?.user_id &&
      application.status === "approved"
    ) {
      return jsonResponse({
        success: true,
        alreadyExists: true,
        driverId: existingDriver.id,
        userId: existingDriver.user_id,
        email: existingDriver.email || email,
        message:
          "Driver account already exists and the application is approved.",
      });
    }

    // ---------------------------------------------------------
    // Generate temporary password
    // ---------------------------------------------------------

    const temporaryPassword =
      `${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}B!9`;

    // ---------------------------------------------------------
    // Create Supabase Auth user
    // ---------------------------------------------------------

    const {
      data: createdUserData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: application.full_name,
        phone: application.phone,
        role: "driver",
      },
    });

    if (createUserError || !createdUserData.user) {
      console.error(
        "Failed to create driver auth account:",
        createUserError,
      );

      if (
        createUserError?.message
          ?.toLowerCase()
          .includes("already")
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "An account with this email already exists. Please use a different email address for this driver or check the existing driver account.",
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

    const userId = createdUserData.user.id;

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
          onConflict: "user_id,role",
        },
      );

    if (roleError) {
      console.error(
        "Failed to assign driver role:",
        roleError,
      );

      // Clean up Auth user if role assignment fails.
      await supabaseAdmin.auth.admin.deleteUser(userId);

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

    let driverId: string | undefined;

    if (existingDriver) {
      const {
        data: updatedDriver,
        error: updateDriverError,
      } = await supabaseAdmin
        .from("drivers")
        .update({
          user_id: userId,
          application_id: applicationId,
          full_name: application.full_name,
          phone: application.phone,
          email,
          park_id: application.park_id,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDriver.id)
        .select("id")
        .single();

      if (updateDriverError || !updatedDriver) {
        console.error(
          "Failed to update driver record:",
          updateDriverError,
        );

        // Clean up Auth user if driver record fails.
        await supabaseAdmin.auth.admin.deleteUser(userId);

        return jsonResponse(
          {
            success: false,
            error:
              "Driver account was created, but the driver record could not be updated.",
          },
          500,
        );
      }

      driverId = updatedDriver.id;
    } else {
      const {
        data: newDriver,
        error: driverError,
      } = await supabaseAdmin
        .from("drivers")
        .insert({
          user_id: userId,
          application_id: applicationId,
          full_name: application.full_name,
          phone: application.phone,
          email,
          park_id: application.park_id,
          status: "active",
        })
        .select("id")
        .single();

      if (driverError || !newDriver) {
        console.error(
          "Failed to create driver record:",
          driverError,
        );

        // Clean up Auth user if driver record fails.
        await supabaseAdmin.auth.admin.deleteUser(userId);

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
    // Approve the application
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