import type { Metadata } from "next";
import TasksClient from "./TasksClient";

export const metadata: Metadata = {
  title: "My Tasks | QC Checker | Paikari",
  description: "Current lots assigned for QC inspection.",
};

export default function QCCheckerTasksPage() {
  return <TasksClient />;
}
