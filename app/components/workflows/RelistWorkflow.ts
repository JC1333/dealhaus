import { supabase } from "@/lib/supabase";

export async function runRelistWorkflow() {
  let relistCreated = 0;
  let relistExisting = 0;
  let relistErrors = 0;

  const { data: readyPrepTasks, error: prepError } = await supabase
    .from("listing_prep_tasks")
    .select("id,seller_lead_id")
    .eq("prep_status", "ready_for_relist")
    .limit(100);

  if (prepError) {
    relistErrors += 1;
    console.log("Workflow prep task sweep error:", prepError.message);
  }

  if (readyPrepTasks && readyPrepTasks.length > 0) {
    for (const task of readyPrepTasks) {
            if (!task.seller_lead_id) {
        relistErrors += 1;
        continue;
      }

      const { data: sellerLead, error: sellerLeadError } =
        await supabase
          .from("seller_leads")
          .select("status,approval_status,agreement_accepted")
          .eq("id", task.seller_lead_id)
          .single();

      if (
        sellerLeadError ||
        !sellerLead ||
        sellerLead.approval_status !== "approved" ||
        sellerLead.agreement_accepted !== true ||
        sellerLead.status !== "sent_to_relist_queue"
      ) {
        console.log(
          `SKIPPED RELIST TASK ${task.id}: seller is not currently authorized for relisting`
        );
        continue;
      }
      const { data: existingRelistTasks } = await supabase
  .from("ai_relist_tasks")
  .select("id")
  .eq("listing_prep_task_id", task.id)
  .limit(1);

if (existingRelistTasks && existingRelistTasks.length > 0) {
  relistExisting += 1;
  continue;
}

      const { data: newRelistTask, error: relistError } = await supabase
        .from("ai_relist_tasks")
        .insert({
          listing_prep_task_id: task.id,
          relist_status: "pending",
        })
        .select()
        .single();

      if (relistError) {
        relistErrors += 1;

        await supabase.from("exception_tasks").insert({
          exception_type: "workflow_ai_relist_task_failed",
          related_table: "listing_prep_tasks",
          related_record_id: task.id,
          item_title: "Listing Prep Task",
          exception_status: "open",
          notes: relistError.message,
        });

        continue;
      }

      relistCreated += 1;

      if (newRelistTask?.id) {
        const response = await fetch("/api/generate-ai-relist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            taskId: newRelistTask.id,
          }),
        });

        if (!response.ok) {
          relistErrors += 1;

          await supabase.from("exception_tasks").insert({
            exception_type: "workflow_generate_ai_relist_failed",
            related_table: "ai_relist_tasks",
            related_record_id: newRelistTask.id,
            item_title: "AI Relist Task",
            exception_status: "open",
            notes: "Workflow failed to generate AI relist inventory item.",
          });
        } else {
          console.log("Workflow generated AI relist inventory item.");
        }
      }
    }
  }

  return {
    relistExisting,
    relistCreated,
    relistErrors,
  };
}