import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/session";
import DashboardClient from "./dashboard-client";
export const dynamic="force-dynamic";
export default async function DashboardPage(){if(!(await getAdminSession()))redirect("/");return <DashboardClient/>;}
