import { supabase } from "@/lib/supabase";

export async function runSellerWorkflow() {
  let alreadyPrepared = 0;
  let created = 0;
  let errors = 0;
  let approvedCount = 0;

  const { data: approvedLeads, error } = await supabase
    .from("seller_leads")
    .select("id,item_title")
    .eq("status", "seller_approved")
    .limit(5);

  if (error) {
    console.log("Workflow seller approval check error:", error.message);

    return {
      approvedCount,
      alreadyPrepared,
      created,
      errors: errors + 1,
    };
  }

  approvedCount = approvedLeads?.length || 0;

  if (approvedLeads && approvedLeads.length > 0) {
    for (const lead of approvedLeads) {
      const { data: existingTask } = await supabase
        .from("listing_prep_tasks")
        .select("id")
        .eq("seller_lead_id", lead.id)
        .limit(1)
        .single();

      if (existingTask) {
        alreadyPrepared += 1;
        continue;
      }

      const { error: insertError } = await supabase
        .from("listing_prep_tasks")
        .insert({
          seller_lead_id: lead.id,
          prep_status: "ready_for_relist",
        });

      if (insertError) {
        errors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_listing_prep_failed",
          related_table: "seller_leads",
          related_record_id: lead.id,
          item_title: lead.item_title,
          exception_status: "open",
          notes: insertError.message,
        });
      } else {
        created += 1;
      }
    }
  }

  return {
    approvedCount,
    alreadyPrepared,
    created,
    errors,
  };
}