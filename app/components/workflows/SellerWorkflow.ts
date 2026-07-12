import { supabase } from "@/lib/supabase";

async function withTimeout<T>(
  request: PromiseLike<T>,
  label: string,
  milliseconds = 10000
): Promise<T> {
  return Promise.race([
    Promise.resolve(request),
    new Promise<T>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${label} timed out after ${milliseconds / 1000} seconds.`));
      }, milliseconds);
    }),
  ]);
}

export async function runSellerWorkflow() {
  let alreadyPrepared = 0;
  let created = 0;
  let errors = 0;
  let approvedCount = 0;

  try {
    const { data: approvedLeads, error } = await withTimeout(
      supabase
        .from("seller_leads")
        .select(`
          id,
          item_title,
          item_description,
          seller_name,
          seller_city,
          seller_state,
          seller_email,
          asking_price,
          estimated_profit
        `)

        .eq("approval_status", "approved")
        .eq("agreement_accepted", true)
        .neq("status", "sent_to_relist_queue")
        .limit(100),

      "Seller lead approval query"
    );

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
        try {
          const { data: existingTasks, error: existingTaskError } =
            await withTimeout(
              supabase
                .from("listing_prep_tasks")
                .select("id")
                .eq("seller_lead_id", lead.id)
                .limit(1),
              `Existing listing-prep check for ${lead.item_title}`
            );

          if (existingTaskError) {
            console.log(
              "Listing prep lookup error:",
              existingTaskError.message
            );
            errors += 1;
            continue;
          }

          const existingTask = existingTasks?.[0];

          if (existingTask) {
            alreadyPrepared += 1;
            continue;
          }

          const { error: insertError } = await withTimeout(
            supabase.from("listing_prep_tasks").insert({
              seller_lead_id: lead.id,
              item_title: lead.item_title,
              seller_name: lead.seller_name,
              seller_city: lead.seller_city,
              seller_state: lead.seller_state,
              asking_price: lead.asking_price,
              estimated_profit: lead.estimated_profit,
              prep_status: "ready_for_relist",
            }),
            `Listing-prep insert for ${lead.item_title}`
          );

          if (insertError) {
            console.log("Listing prep insert error:", insertError.message);
            errors += 1;

            try {
              const { data: existingException } = await withTimeout(
                supabase
                  .from("exception_tasks")
                  .select("id")
                  .eq("exception_type", "workflow_listing_prep_failed")
                  .eq("related_table", "seller_leads")
                  .eq("related_record_id", lead.id)
                  .eq("exception_status", "open")
                  .limit(1),
                `Exception lookup for ${lead.item_title}`
              );

              if (!existingException || existingException.length === 0) {
                await withTimeout(
                  supabase.from("exception_tasks").insert({
                    exception_type: "workflow_listing_prep_failed",
                    related_table: "seller_leads",
                    related_record_id: lead.id,
                    item_title: lead.item_title,
                    exception_status: "open",
                    notes: insertError.message,
                  }),
                  `Exception insert for ${lead.item_title}`
                );
              }
            } catch (exceptionError: any) {
              console.log(
                "Seller workflow exception logging failed:",
                exceptionError?.message || exceptionError
              );
            }
          } else {
            created += 1;
          }
        } catch (leadError: any) {
          console.log(
            "Seller workflow lead processing error:",
            leadError?.message || leadError
          );
          errors += 1;
        }
      }
    }
  } catch (workflowError: any) {
    console.log(
      "Seller workflow timed out or failed:",
      workflowError?.message || workflowError
    );
    errors += 1;
  }

  return {
    approvedCount,
    alreadyPrepared,
    created,
    errors,
  };
}
