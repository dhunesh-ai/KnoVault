import { redirect } from "next/navigation";

export default function SecureNotesPage() {
  redirect("/notes");
}
