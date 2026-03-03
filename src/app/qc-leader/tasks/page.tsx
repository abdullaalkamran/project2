import type { Metadata } from "next";
import TasksClient from "./TasksClient";

export const metadata: Metadata = {
  title: "QC Tasks | QC Leader | Paikari",
  description: "Live inspection tasks and current checker status.",
};

export default function QCLeaderTasksPage() {
  return <TasksClient />;
}
