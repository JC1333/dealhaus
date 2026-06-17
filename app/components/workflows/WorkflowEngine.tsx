"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function WorkflowEngine() {
  async function runWorkflow() {
    console.log("Workflow cycle started");

    let alreadyPrepared = 0;
    let created = 0;
    let errors = 0;

    const { data: approvedLeads, error } = await supabase
      .from("seller_leads")
      .select("id,item_title")
      .eq("status", "seller_approved")
      .limit(5);

    if (error) {
      console.log("Workflow seller approval check error:", error.message);
      return;
    }

    if (!approvedLeads || approvedLeads.length === 0) {
      console.log("Workflow summary: 0 approved sellers found");
      return;
    }

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

      const { data: newPrepTask, error: insertError } = await supabase
  .from("listing_prep_tasks")
  .insert({
    seller_lead_id: lead.id,
    prep_status: "ready_for_relist",
  })
  .select()
  .single();

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
      if (newPrepTask) {
  const { data: existingRelist } = await supabase
    .from("ai_relist_tasks")
    .select("id")
    .eq("listing_prep_task_id", newPrepTask.id)
    .limit(1)
    .single();

  if (!existingRelist) {
    const { error: relistError } = await supabase
      .from("ai_relist_tasks")
      .insert({
        listing_prep_task_id: newPrepTask.id,
        relist_status: "pending",
      });

    if (relistError) {
      console.log("AI Relist task creation error:", relistError.message);
    } else {
      console.log("Workflow created AI Relist task.");
    }
  }
}
    }
let relistCreated = 0;
let relistExisting = 0;
let relistErrors = 0;

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

    const { error: relistError } = await supabase
      .from("ai_relist_tasks")
      .insert({
        listing_prep_task_id: task.id,
        relist_status: "pending",
      });

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
    } else {
      relistCreated += 1;
    }
  }
}
    console.log(
  `Workflow summary: approved=${approvedLeads.length}, alreadyPrepared=${alreadyPrepared}, created=${created}, relistExisting=${relistExisting}, relistCreated=${relistCreated}, errors=${errors + relistErrors}`
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