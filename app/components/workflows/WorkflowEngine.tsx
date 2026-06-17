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

    console.log(
      `Workflow summary: approved=${approvedLeads.length}, alreadyPrepared=${alreadyPrepared}, created=${created}, errors=${errors}`
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