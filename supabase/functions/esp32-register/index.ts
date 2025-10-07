import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (req.method === "POST") {
      const body = await req.json();
      const { device_id, project_id, role, auto_update, tank_shape, height_cm, width_cm, length_cm, max_flow_in, max_flow_out, pump_lower_threshold, pump_upper_threshold } = body;

      if (!device_id || !project_id) {
        return new Response(
          JSON.stringify({ error: "device_id and project_id are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: project } = await supabase
        .from("projects")
        .select("project_type")
        .eq("project_id", project_id)
        .maybeSingle();

      if (!project) {
        return new Response(
          JSON.stringify({ error: "Project not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: existingDevice } = await supabase
        .from("devices")
        .select("device_id")
        .eq("device_id", device_id)
        .maybeSingle();

      if (existingDevice) {
        const { data: updated, error } = await supabase
          .from("devices")
          .update({
            role: role || "regular",
            auto_update: auto_update !== undefined ? auto_update : false,
            tank_shape,
            height_cm,
            width_cm,
            length_cm,
            max_flow_in: max_flow_in !== undefined ? max_flow_in : 0,
            max_flow_out: max_flow_out !== undefined ? max_flow_out : 0,
            pump_lower_threshold: pump_lower_threshold !== undefined ? pump_lower_threshold : 15,
            pump_upper_threshold: pump_upper_threshold !== undefined ? pump_upper_threshold : 100,
            updated_at: new Date().toISOString(),
          })
          .eq("device_id", device_id)
          .select()
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true, device: updated, message: "Device updated" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: newDevice, error } = await supabase
        .from("devices")
        .insert({
          device_id,
          project_id,
          role: role || "regular",
          auto_update: auto_update !== undefined ? auto_update : false,
          tank_shape,
          height_cm,
          width_cm,
          length_cm,
          max_flow_in: max_flow_in !== undefined ? max_flow_in : 0,
          max_flow_out: max_flow_out !== undefined ? max_flow_out : 0,
          pump_lower_threshold: pump_lower_threshold !== undefined ? pump_lower_threshold : 15,
          pump_upper_threshold: pump_upper_threshold !== undefined ? pump_upper_threshold : 100,
          manual_switch: 0,
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, device: newDevice, message: "Device registered" }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});