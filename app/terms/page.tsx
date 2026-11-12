import type { Metadata } from "next";
import { ProsePage, Topic } from "@/components/ui/prose";

export const metadata: Metadata = { title: "Terms", description: "The terms for using these PDF tools." };

export default function TermsPage() {
  return (
    <ProsePage title="Terms" intro="These tools are free to use. By using them you agree to the points below.">
      <Topic title="Your files are your responsibility">
        <p>Use the tools only on files you have the right to use and change. In particular, remove a password only from a file you are allowed to open.</p>
      </Topic>
      <Topic title="Keep your originals">
        <p>The tools give you a new file and leave your original untouched. Check the result before you rely on it or delete the original. Your files never leave this device, so there is no copy anywhere else to recover.</p>
      </Topic>
      <Topic title="No guarantees">
        <p>The tools are provided as they are, without any warranty. They may not work with every file, and a result may differ from what you expected. To the extent the law allows, the people who run this site are not liable for loss or damage that comes from using it.</p>
      </Topic>
      <Topic title="Fair use of the site">
        <p>Do not try to disrupt the site or use it to break the law.</p>
      </Topic>
      <Topic title="Changes">
        <p>The tools and these terms may change. The current terms are always on this page.</p>
      </Topic>
    </ProsePage>
  );
}
