import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

Deno.serve(async (req: Request) => {
  // -----------------------------------------
  // CORS
  // -----------------------------------------
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // -----------------------------------------
  // Only allow POST
  // -----------------------------------------
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    // -----------------------------------------
    // 1. Environment variables
    // -----------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        "Missing Supabase environment variables",
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Supabase environment variables are not configured",
        },
        500,
      );
    }

    // -----------------------------------------
    // 2. Admin Supabase client
    // -----------------------------------------
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // -----------------------------------------
    // 3. Get authorization header
    // -----------------------------------------
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized",
        },
        401,
      );
    }

    const token = authHeader.replace(
      /^Bearer\s+/i,
      "",
    );

    if (!token) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid authorization token",
        },
        401,
      );
    }

    // -----------------------------------------
    // 4. Verify logged-in user
    // -----------------------------------------
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error(
        "User verification failed:",
        userError,
      );

      return jsonResponse(
        {
          success: false,
          error: "Unauthorized",
        },
        401,
      );
    }

    // -----------------------------------------
    // 5. Verify admin role
    // -----------------------------------------
    const {
      data: isAdmin,
      error: adminError,
    } = await supabaseAdmin.rpc("is_admin", {
      _user_id: user.id,
    });

    if (adminError) {
      console.error(
        "Admin role check failed:",
        adminError,
      );

      return jsonResponse(
        {
          success: false,
          error: "Unable to verify admin access",
        },
        500,
      );
    }

    if (!isAdmin) {
      return jsonResponse(
        {
          success: false,
          error: "Admin access required",
        },
        403,
      );
    }

    // -----------------------------------------
    // 6. Read request body
    // -----------------------------------------
    let body: {
      applicationId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON request body",
        },
        400,
      );
    }

    const applicationId = body.applicationId?.trim();

    if (!applicationId) {
      return jsonResponse(
        {
          success: false,
          error: "Application ID is required",
        },
        400,
      );
    }

    // -----------------------------------------
    // 7. Get driver application
    // -----------------------------------------
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
        "Driver application lookup failed:",
        applicationError,
      );

      return jsonResponse(
        {
          success: false,
          error: "Driver application not found",
        },
        404,
      );
    }

    // -----------------------------------------
    // 8. Validate application
    // -----------------------------------------
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

    // -----------------------------------------
    // 9. Validate park
    // -----------------------------------------
    if (!application.park_id) {
      return jsonResponse(
        {
          success: false,
          error:
            "Driver application must have an operating park before approval.",
        },
        400,
      );
    }

    // -----------------------------------------
    // 10. Validate email
    // -----------------------------------------
    const driverEmail = application.email
      ?.trim()
      .toLowerCase();

    if (!driverEmail) {
      return jsonResponse(
        {
          success: false,
          error:
            "Driver must have an email address before an account can be created.",
        },
        400,
      );
    }

    // -----------------------------------------
    // 11. Check existing driver record
    // -----------------------------------------
    const {
      data: existingDriver,
      error: existingDriverError,
    } = await supabaseAdmin
      .from("drivers")
      .select("*")
      .eq("application_id", application.id)
      .maybeSingle();

    if (existingDriverError) {
      console.error(
        "Driver lookup failed:",
        existingDriverError,
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to check existing driver record",
        },
        500,
      );
    }

    // -----------------------------------------
    // 12. Already fully configured driver
    // -----------------------------------------
    if (
      existingDriver?.user_id &&
      application.status === "approved"
    ) {
      return jsonResponse({
        success: true,
        alreadyExists: true,
        driverId: existingDriver.id,
        userId: existingDriver.user_id,
        email: driverEmail,
        message: "Driver account already exists",
      });
    }

    // -----------------------------------------
    // 13. Temporary password
    // -----------------------------------------
    const temporaryPassword =
      crypto.randomUUID().replace(/-/g, "").slice(0, 12) +
      "A1!";

    // -----------------------------------------
    // 14. Create Auth account
    // -----------------------------------------
    const {
      data: createdUserData,
      error: createUserError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: driverEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: application.full_name,
        phone: application.phone,
        account_type: "driver",
      },
    });

    let authUser: {
      id: string;
      email?: string | null;
    } | null = null;

    let createdNewAuthUser = false;

    if (createUserError) {
      console.error(
        "Auth account creation failed:",
        createUserError,
      );

      /*
       * Do NOT automatically take over an existing
       * Supabase account.
       *
       * If this email already belongs to another user,
       * the admin should resolve the email conflict
       * instead of receiving a password that may not work.
       */
      if (
        createUserError.message
          .toLowerCase()
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
          error: createUserError.message,
        },
        400,
      );
    }

    if (!createdUserData.user) {
      throw new Error(
        "Supabase did not return the created user",
      );
    }

    authUser = {
      id: createdUserData.user.id,
      email: createdUserData.user.email,
    };

    createdNewAuthUser = true;

    // -----------------------------------------
    // 15. Assign driver role
    // -----------------------------------------
    const { error: roleError } =
      await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id: authUser.id,
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

      // Clean up newly-created Auth user
      if (createdNewAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(
          authUser.id,
        );
      }

      throw roleError;
    }

    // -----------------------------------------
    // 16. Create or update driver record
    // -----------------------------------------
    let driverId = existingDriver?.id ?? null;

    if (existingDriver) {
      const {
        error: driverUpdateError,
      } = await supabaseAdmin
        .from("drivers")
        .update({
          user_id: authUser.id,
          application_id: application.id,
          full_name: application.full_name,
          phone: application.phone,
          email: driverEmail,
          park_id: application.park_id,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDriver.id);

      if (driverUpdateError) {
        console.error(
          "Failed to update driver:",
          driverUpdateError,
        );

        if (createdNewAuthUser) {
          await supabaseAdmin.auth.admin.deleteUser(
            authUser.id,
          );
        }

        throw driverUpdateError;
      }
    } else {
      const {
        data: driver,
        error: driverInsertError,
      } = await supabaseAdmin
        .from("drivers")
        .insert({
          user_id: authUser.id,
          application_id: application.id,
          full_name: application.full_name,
          phone: application.phone,
          email: driverEmail,
          park_id: application.park_id,
          status: "active",
        })
        .select("id")
        .single();

      if (driverInsertError) {
        console.error(
          "Failed to create driver record:",
          driverInsertError,
        );

        if (createdNewAuthUser) {
          await supabaseAdmin.auth.admin.deleteUser(
            authUser.id,
          );
        }

        throw driverInsertError;
      }

      driverId = driver.id;
    }

    // -----------------------------------------
    // 17. Mark application as approved
    // -----------------------------------------
    const {
      error: approvalError,
    } = await supabaseAdmin
      .from("driver_applications")
      .update({
        status: "approved",
      })
      .eq("id", application.id);

    if (approvalError) {
      console.error(
        "Failed to approve application:",
        approvalError,
      );

      /*
       * The driver account exists at this point.
       * We deliberately do not delete it here because
       * the account and driver record were successfully
       * created. The admin can retry the approval update.
       */
      throw approvalError;
    }

    // -----------------------------------------
    // 18. Return account information
    // -----------------------------------------
    return jsonResponse({
      success: true,
      alreadyExists: false,
      driverId,
      userId: authUser.id,
      email: authUser.email ?? driverEmail,
      temporaryPassword,
      message:
        "Driver account created and application approved successfully.",
    });
  } catch (error) {
    console.error(
      "Create driver account error:",
      error,
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create driver account",
      },
      500,
    );
  }
});