import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage, Topic } from "@/components/ui/prose";

export const metadata: Metadata = { title: "Help", description: "How the PDF tools work, what they can and cannot do, and what to try when something fails." };

export default function HelpPage() {
  return (
    <ProsePage title="Help" intro="How these tools work, what they can and cannot do, and what to try when something goes wrong.">
      <Topic title="Where do my files go?">
        <p>Nowhere. Your files never leave this device. Every tool does its work inside this browser tab, so nothing is uploaded, nothing is stored, and nobody else can see your files.</p>
      </Topic>
      <Topic title="Do I need to delete my files afterwards?">
        <p>No. Nothing is uploaded, so there is nothing to delete. Closing or reloading the tab clears everything the tools were holding. The only copies are the ones you download.</p>
      </Topic>
      <Topic title="Is there a size limit?">
        <p>There is no set limit, no daily count and no account. The real limit is your device&apos;s memory, because the work happens here and not on a server. Very large jobs (hundreds of megabytes, or on a phone a few dozen) may be slow or fail. If that happens, try fewer files at a time, or use a computer instead of a phone.</p>
      </Topic>
      <Topic title="Why did my file barely get smaller?">
        <p>Compress shrinks the photos and scans inside a PDF. A file that is mostly text is already small. Some scanners store pages in a way this tool leaves untouched, and those files will not shrink much either. Results also differ a little between browsers.</p>
      </Topic>
      <Topic title="My file is locked">
        <p>If a PDF needs a password, you will be asked for it. The password is used on this device only. These tools cannot open a file whose password you do not know.</p>
        <p>A file you opened with its password comes out of every tool without the lock. To lock the result again, use <Link href="/protect">Add a password</Link>.</p>
      </Topic>
      <Topic title="Things these tools do not keep">
        <ul>
          <li>Bookmarks and fillable form fields are not carried over when files are merged or rearranged.</li>
          <li>A digital signature stops being valid once a file is changed in any way. That is true of every PDF tool.</li>
          <li>Restrictions such as &quot;no printing&quot; are removed when a restricted file is processed.</li>
        </ul>
      </Topic>
      <Topic title="Moving files and pages with the keyboard">
        <p>Each file or page has a Move button. Focus it, press Space to pick the item up, use the arrow keys to move it, and press Space again to put it down. Escape cancels.</p>
      </Topic>
      <Topic title="I reloaded the page and lost my work">
        <p>Because nothing is saved anywhere, a reload starts every tool from scratch. The page asks before you leave while a job is running or a result has not been downloaded.</p>
      </Topic>
      <Topic title="Which browsers work?">
        <p>Current versions of Chrome, Edge and Safari. Older browsers may not be able to run the tools at all.</p>
      </Topic>
    </ProsePage>
  );
}
