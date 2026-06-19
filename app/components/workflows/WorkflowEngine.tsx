"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function WorkflowEngine() {
  async function runWorkflow() {
    console.log("Workflow cycle started");

    let alreadyPrepared = 0;
    let created = 0;
    let errors = 0;

    let relistCreated = 0;
    let relistExisting = 0;
    let relistErrors = 0;

    const { data: approvedLeads, error } = await supabase
      .from("seller_leads")
      .select("id,item_title")
      .eq("status", "seller_approved")
      .limit(5);

    if (error) {
      console.log("Workflow seller approval check error:", error.message);
      return;
    }

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

    const { data: readyPrepTasks, error: prepError } = await supabase
      .from("listing_prep_tasks")
      .select("id")
      .eq("prep_status", "ready_for_relist")
      .limit(10);

    if (prepError) {
      relistErrors += 1;
      console.log("Workflow prep task sweep error:", prepError.message);
    }

    if (readyPrepTasks && readyPrepTasks.length > 0) {
      for (const task of readyPrepTasks) {
        const { data: existingRelist } = await supabase
          .from("ai_relist_tasks")
          .select("id")
          .eq("listing_prep_task_id", task.id)
          .limit(1)
          .single();

        if (existingRelist) {
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
let buyerMatchCreated = 0;
let buyerMatchExisting = 0;
let buyerMatchErrors = 0;

const { data: activeInventory, error: inventoryError } = await supabase
  .from("inventory")
  .select("id,title,price,status")
  .eq("status", "active")
  .limit(5);

if (inventoryError) {
  buyerMatchErrors += 1;
  console.log("Workflow inventory check error:", inventoryError.message);
}

if (activeInventory && activeInventory.length > 0) {
  for (const item of activeInventory) {
    const { data: existingMatch } = await supabase
      .from("buyer_matches")
      .select("id")
      .eq("inventory_id", item.id)
      .limit(1)
      .single();

    if (existingMatch) {
      buyerMatchExisting += 1;
      continue;
    }

    const { error: matchError } = await supabase.from("buyer_matches").insert({
      inventory_id: item.id,
      inventory_title: item.title,
      buyer_name: "Workflow Qualified Buyer",
      buyer_email: "workflow-buyer@dealhaus.local",
      buyer_interest_score: 88,
      outreach_status: "new",
    });

    if (matchError) {
      buyerMatchErrors += 1;

      await supabase.from("exception_tasks").insert({
        exception_type: "workflow_buyer_match_failed",
        related_table: "inventory",
        related_record_id: item.id,
        item_title: item.title,
        exception_status: "open",
        notes: matchError.message,
      });
    } else {
      buyerMatchCreated += 1;
    }
  }
}
    console.log(
  `Workflow summary: approved=${approvedLeads?.length || 0}, alreadyPrepared=${alreadyPrepared}, created=${created}, relistExisting=${relistExisting}, relistCreated=${relistCreated}, buyerMatchExisting=${buyerMatchExisting}, buyerMatchCreated=${buyerMatchCreated}, errors=${errors + relistErrors + buyerMatchErrors}`
);
  }

  useEffect(() => {
    runWorkflow();

    const interval = setInterval(() => {
      runWorkflow();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
}