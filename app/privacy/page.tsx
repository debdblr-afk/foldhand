import type { Metadata } from "next";
import { ProsePage, Topic } from "@/components/ui/prose";

export const metadata: Metadata = { title: "Privacy", description: "Your files never leave this device. What this site does and does not collect." };

export default function PrivacyPage() {
  return (
    <ProsePage title="Privacy" intro="The short version: your files never leave this device, and this site does not ask who you are.">
      <Topic title="Your files">
        <p>Files you add are read by this browser tab and worked on here. They are not uploaded, copied to a server, or kept after you close or reload the tab. Passwords you type to open or lock a file are used in the same way and are not sent anywhere.</p>
      </Topic>
      <Topic title="What this site does not do">
        <ul>
          <li>No accounts, so no names, email addresses or passwords are collected.</li>
          <li>No advertising and no tracking of what you do with the tools.</li>
          <li>No cookies and nothing saved in your browser&apos;s storage.</li>
        </ul>
      </Topic>
      <Topic title="What the hosting company sees">
        <p>Like any website, the pages are delivered by a hosting company. When your browser asks for a page, the host&apos;s servers see the usual technical details of that request, such as your IP address, the time and the browser you use, and may keep them in logs for a while. Those logs contain nothing about your files, because your files are never sent.</p>
      </Topic>
      <Topic title="Changes">
        <p>If the site ever starts collecting anything, this page will say so before it happens.</p>
      </Topic>
    </ProsePage>
  );
}
