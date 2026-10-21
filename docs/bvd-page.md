# BVD page: setup

`bvd.html` is the embed for a binocular vision dysfunction (BVD) page on the clinic site. It tells the same story as the Neurolens page (one copy of the story serves both, so a change to the story shows on both pages) and ends differently: BVD first, with Neurolens as one way to treat it.

## What's in the embed

1. **Binocular vision dysfunction (BVD), explained** (the embed's title), a short introduction to what BVD is for someone who has just arrived, then *See what your eyes are doing*: the 34-step story on the 3D face. Its last card reads "That's why treating BVD aims to help the eyes line up with less holding and correcting, for example with prism glasses… Read on to see how we check for it."
2. **What BVD can feel like:** a checklist of the symptoms people most often describe, then the less common ones (dizziness, motion sickness, feeling overwhelmed in busy places), with a reminder that these have many causes.
3. **Why small misalignments can cause symptoms:** the cause, the effect, and the numbered trigeminal nerve diagram with its key.
4. **How we check for BVD:** the questionnaire, measuring how the eyes line up far and near, and a plan.
5. **Ways to treat it:** prism glasses (Neurolens as one type, linking to the Neurolens page), the right prescription, eye exercises for some types, and referral.
6. **Could you have BVD?** Questionnaire, booking and phone, recorded as conversions like the Neurolens page's.
7. **Learn more from Dr Burke:** the four articles, the BVD article first.

## Set up the page in Squarespace

Like the condition pages for the eye movement simulator, the BVD page lives in **Not Linked**: public and searchable, but not in the menu.

1. **Pages → Not Linked → +** → Blank page. Page title: *Binocular Vision Dysfunction (BVD)*.
2. **Page settings → General → URL slug:** `binocular-vision-dysfunction`
3. **Page settings → SEO:**
   - SEO title: *Binocular Vision Dysfunction (BVD) in Calgary* (the site adds its own name after it, so it isn't repeated here)
   - SEO description: *Headaches, eye strain or neck pain after reading or screens? See how eyes that rest slightly out of line can cause BVD symptoms, and how we check for it.* (152 characters; Google shows about 155)
   - **Social Image** (Page settings → Social Image): upload `docs/social/bvd-share.jpg` (1200×630), the picture shown when the page is shared.
4. **Page content,** top to bottom (the same layout as the Neurolens page):
   - A Code block with the embed code below. The embed opens with the page's title and an introduction to BVD, so nothing needs to go above it.
   - A text block with the "BVD in Calgary" text below. Text typed into the page itself counts most with search engines.
   - The questions and answers below, as a text block or an Accordion block.
5. **A short address for videos and social posts:** in Settings, open URL Mappings (under Advanced or Developer Tools, depending on your Squarespace version), add this line, then save:

   ```
   /bvd -> /binocular-vision-dysfunction 301
   ```

   `calgaryvisioncentre.com/bvd` then works in YouTube and TikTok descriptions and is easy to say out loud.

### "BVD in Calgary" text block (below the embed)

> ## Binocular vision dysfunction (BVD) in Calgary
>
> At Calgary Vision Centre, in Gulf Canada Square on the +15 level in downtown Calgary, we check for BVD by measuring how your eyes line up, far and near, and explain what we find and what would help. If headaches, eye strain, neck pain or tired eyes after reading or screen time sound familiar, book an appointment online or call 403-237-0505.

Link "book an appointment online" to `https://calgaryvisioncentre.visualbook.ca/booknow` and the phone number to `tel:4032370505`.

### Embed code

```html
<div id="bvd-demo" style="width:100%;"></div>
<script>
  (function () {
    var APP = "https://drburke-droid.github.io/neurogaze/bvd.html";
    var ORIGIN = "https://drburke-droid.github.io";
    var box = document.getElementById("bvd-demo");

    var iframe = document.createElement("iframe");
    iframe.src = APP + "?embed=1&parent=" + encodeURIComponent(location.origin + location.pathname);
    iframe.title = "Binocular vision dysfunction (BVD), explained";
    iframe.scrolling = "no";
    iframe.setAttribute("allow", "fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.cssText = "display:block;width:100%;height:2800px;border:0;overflow:hidden;";
    box.appendChild(iframe);

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN || !e.data || e.source !== iframe.contentWindow) return;
      // The embed reports its full height, so this page does all the scrolling
      if (e.data.type === "gaze-height") iframe.style.height = e.data.height + "px";
      // Booking and phone links inside the embed count as conversions, like the site's own buttons
      if (e.data.type === "cvc-conversion" && typeof gtag === "function") {
        gtag("event", "conversion", { send_to: "AW-1005862372/nO0zCPHnjrQaEOT70N8D" });
      }
    });
  })();
</script>
```

### Questions and answers

> **Is BVD the same as a lazy eye or a squint?**
> No. With BVD the eyes look straight to other people. The misalignment is small and hidden, because the brain keeps pulling the eyes into line; it shows up when the eyes are measured, for example when one eye is covered.
>
> **How do you check for BVD?**
> Seeing 20/20 and having healthy eyes doesn't rule it out, because small misalignments are found with specific tests of how your eyes line up, far away and up close. We start with a short questionnaire about your symptoms, then measure your eye alignment.
>
> **How is BVD treated?**
> Often with glasses that include a small amount of prism, such as Neurolens. Depending on the type, an updated prescription or eye exercises can also help.
>
> **I saw BVD on social media. Is this the same thing?**
> Yes, those videos describe the same idea: eyes that rest slightly out of line, linked to headaches, eye strain, dizziness and neck pain. Measuring your eye alignment is the way to know whether it applies to you.

## Help Google find it, without a menu item

Squarespace's sitemap includes Not Linked pages, so Google can find the page on its own, but pages that other pages link to rank better. Add a few links in the content instead of the menu:

- **The Neurolens page:** a line in the text block below its embed, for example *Want the bigger picture? See [Binocular vision dysfunction (BVD), explained](/binocular-vision-dysfunction).*
- **The BVD blog post:** a link near the top and again at the end.
- Optionally the concussion and reading posts, and the footer.

Then, in Google Search Console, paste `https://calgaryvisioncentre.com/binocular-vision-dysfunction` into **URL inspection** and click **Request indexing**. After a few weeks, **Performance → Search results** shows which searches bring people to it.

## Notes

- Both embeds are marked `noindex, indexifembedded`: search engines may index them as part of the page that embeds them, not as separate results.
- The story, its stage and the styles are shared with the Neurolens page (`neurolens.js`, `story-stage.js`, `story.css`); only the closing card differs, set by `<body data-page="bvd">`.
- Wording follows the same rules as the Neurolens page: the symptom link is described as "thought to", there are no comparisons with other providers, and BVD is called a common name rather than a single diagnosis.
