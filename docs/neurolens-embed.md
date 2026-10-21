# Neurolens page: one embed

`neurolens.html` replaces most of the Neurolens page (`calgaryvisioncentre.com/neurolens-calgary`) with a single, patient-friendly embed:

1. **How Neurolens works** (the embed's title), then a short introduction to what Neurolens is for someone who has just arrived, then *See what your eyes are doing*: a click-through story on a 3D face, 34 short steps, each written across the forehead with its Back / Next buttons right there on the face:
   - Eyes look straight because the brain keeps the two eyes' information lined up. The target is a white ball on a vertical stick: it starts small, close to the face with the eyes turned in, then pulls back toward the viewer, dropping a little below the eye line, as the eyes straighten, so it's clear they are now looking far away. Then the visitor can drag the ball (or use the up and down arrow keys) closer to the face and back out, and watch both eyes turn in and straighten to follow it. A ring on the ball shows where each eye is aiming. An eye that isn't used drifts to its resting position; where that is, and how well we cope with it, is the essence of BVD.
   - **Cover test, hands on:** the visitor drags a solid paddle over an eye, then clicks it to open an X-ray window and peek behind it: the covered eye has drifted (exophoric). They then cover the other eye and see the roles swap. On these steps Next becomes **Show me**, which does it for them.
   - **Try it yourself:** the face dims behind a red dot. The visitor keeps looking at it while covering one eye with a hand, then the other, back and forth. If the dot jumps, they've found that their own eye's resting position, behind the hand, wasn't exactly straight (a small jump is common).
   - Asleep, the eyelids close, then turn see-through (X-ray, in classic X-ray green like the paddle's window) to show both eyes turned out to rest. On waking, with both eyes open and the brain paying attention to both, they straighten onto the target again. During every saccade the brain switches off the eyes' input (try it across the room, and in a mirror versus a phone's front camera), so the eyes start to drift and land slightly out of line.
   - **Reading** is a chain of saccades, with both eyes turned in to meet on the card (shown at twice the real amount so it can be seen): at full speed (250 words a minute, a typical adult pace, misses at true size) it looks normal; slowed down and magnified, the miss after each jump, fixation disparity, is clear. For eyes that rest outward, the miss is shown about 40% bigger while reading, and the card says it's usually bigger up close, where the eyes turn in the furthest from where they'd rest (for eyes that rest inward, it can be the reverse: distance is sometimes harder than reading, as the eyes must keep straightening out).
   - **Inside the head:** the head turns to its profile. The brain keeps track of where each eye is pointing, helped by sensors (proprioceptors) in the eye muscles that report how stretched each muscle is and how hard it is working, along the trigeminal nerve to the brainstem. The nerve's other territories light up one by one: forehead and eyes, cheeks and upper teeth, the jaw and chewing muscles, the covering of the brain, and the back of the head and neck, whose nerves meet it at the top of the spinal cord. An hour of reading in time-lapse (about 15,000 corrections at 250 words a minute): every jump sends its normal signals (white), and each correction adds an extra burst (amber), until the nerve almost pulses.
   - **Not tired muscles:** close up on the eye socket, each eye weighs about 7.5 grams (about one and a half plastic credit cards) and its muscles flex easily; they have their own myosin, plenty of mitochondria and a rich blood supply (shown flowing), so they're very hard to tire.
   - **Bandwidth:** everyone's eye muscle sensors report with every eye movement (normal traffic); eyes that rest out of line also have to be held in line all day and corrected after every jump, which adds extra traffic on top. A "Trigeminal traffic" meter shows both. That nerve is a shared line (traffic from the forehead, face, jaw, the covering of the brain and the neck joins it), and a home-internet comparison: a download that never stops.
   - **Too much:** the overload is thought to be felt where the nerve reaches, one area at a time: headaches and eye strain, jaw tension or clenching, then neck and shoulder pain.
   - The last step takes away the extra traffic and leaves the normal ("That's the idea behind Neurolens…"), and points to the explanations below.
   - Also: Full speed / Slow motion while reading, and a link to show eyes that drift inward. Arrow keys step back and forth.
2. **Why small misalignments can cause symptoms:** the cause, the effect and the solution, in plain language, then a numbered diagram of the trigeminal nerve with a key.
3. **A neurologist's view:** Dr. Carol Nelson's video, click to play. The video file is kept with the embed (`media/carol-nelson.mp4`, 720p, about 5 MB), so it doesn't depend on Squarespace.
4. **Could Neurolens help you?** Certified provider, questionnaire button, booking button and phone number.
5. **Learn more from Dr Burke:** the four blog articles as cards.

## Squarespace settings, step by step

**Page settings → General**
- Page title: *How Neurolens Works*
- Navigation title: *neurolens®* (as now)
- URL slug: keep `neurolens-calgary`. The page's search ranking belongs to this address. If you rebuild the page as a new page instead of editing it, delete the old one first and give the new one the same slug.

**Page settings → SEO**
- SEO title: *Neurolens Calgary: Prism Glasses for Headaches & Eye Strain* (59 characters). The site adds " | Discover Clear Vision — Book Now — Calgary Vision Centre" after every page's title, and Google shows only about 60 characters, so the words that matter come first.
- SEO description: *Headaches, eye strain or neck pain after screen time? See in 3D how eyes that rest slightly out of line may cause it, and how Neurolens prism glasses work.* (155 characters)
- Leave "Hide page from search results" off.

**Page settings → Social Image:** upload `docs/social/neurolens-share.jpg` (1200×630). It's the picture shown when the page is shared by text, email or social media; without it, the site's small logo is shown.

**Page content, top to bottom**
1. A Code block with the embed code below (paste the current version; it's the same as before apart from the iframe's name). The embed starts with the page's title and an introduction, so nothing needs to go above it.
2. A text block below the embed, for search engines (they weigh text typed into the page itself most):

   > ## Neurolens® in Calgary
   >
   > Calgary Vision Centre is a certified Neurolens provider in downtown Calgary, in Gulf Canada Square on the +15 level. Neurolens glasses have a small, precisely measured amount of contoured prism built into the lenses to help your eyes line up. They're designed for people whose eyes rest slightly out of line, which can contribute to headaches, neck pain, eye strain and a dry-eye feeling, especially after reading or screen time.
   >
   > To find out whether Neurolens could help you, we measure how your eyes line up, far and near, as part of an eye exam, and explain what we find. Book an appointment online or call 403-237-0505.

   Link "Book an appointment online" to `https://calgaryvisioncentre.visualbook.ca/booknow` and the phone number to `tel:4032370505`.
3. Remove everything else from the old page: the intro paragraphs and images, the cause, effect and solution, the certified-provider line and questionnaire button, "Want to learn more", the logo, the article blocks, and both videos. If you'd like to keep the old top video, put it below the embed so the page still opens with its title.

**The neurologist video doesn't need to be on Squarespace.** The embed plays its own copy, so you can delete its Video block (now on "New Page3"). (It used to stream from Squarespace's video library, which doesn't let other websites, like the embed's, play its videos.)

**After publishing**
- In Google Search Console, inspect `https://calgaryvisioncentre.com/neurolens-calgary` and click **Request indexing**, so Google picks up the new page sooner.
- Check the sharing preview: Facebook's Sharing Debugger (developers.facebook.com/tools/debug) shows it and refreshes Facebook's copy.
- "New Page3" (`/new-page-1`) is public and searchable under that name. If it's a scratch page, delete it or turn on "Hide page from search results" in its SEO settings.

**Site-wide, optional:** the long " | Discover Clear Vision — Book Now — Calgary Vision Centre" ending is added to every page title. In Marketing → SEO → Search appearance, a shorter page title format such as `%p | Calgary Vision Centre` leaves more room for each page's own words.

## Embed code

Paste into a **Code block**. The embed sizes itself, so the page does all the scrolling. Clicks on its booking and phone links are passed to the page's Google Ads tag, the same conversion the page's own buttons send.

```html
<div id="neurolens-demo" style="width:100%;"></div>
<script>
  (function () {
    var APP = "https://drburke-droid.github.io/neurogaze/neurolens.html";
    var ORIGIN = "https://drburke-droid.github.io";
    var box = document.getElementById("neurolens-demo");

    var iframe = document.createElement("iframe");
    iframe.src = APP + "?embed=1&parent=" + encodeURIComponent(location.origin + location.pathname);
    iframe.title = "How Neurolens works";
    iframe.scrolling = "no";
    iframe.setAttribute("allow", "fullscreen"); // so the video can go full screen
    iframe.setAttribute("allowfullscreen", "");
    iframe.style.cssText = "display:block;width:100%;height:2400px;border:0;overflow:hidden;";
    box.appendChild(iframe);

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN || !e.data || e.source !== iframe.contentWindow) return;
      // The embed reports its full height, so this page does all the scrolling
      if (e.data.type === "gaze-height") iframe.style.height = e.data.height + "px";
      // Booking and phone links inside the embed count as conversions, like the page's own buttons
      if (e.data.type === "cvc-conversion" && typeof gtag === "function") {
        gtag("event", "conversion", { send_to: "AW-1005862372/nO0zCPHnjrQaEOT70N8D" });
      }
    });
  })();
</script>
```

## Wording changes from the current page

The embed keeps the page's message in plainer language. A few claims were left out or softened; any of them can go back in if you want them:

- "Only Neurolens and their patented contoured prism technology does" and "the only lenses…": now "Neurolens uses a contoured prism…", without the comparison.
- The statistics "nearly 2/3 of adults", "82% of people", "relief in the 80–90% range" and "national return rate is less than 3%". Dr Burke's own figure (fewer than 5% of his patients return their Neurolens) stays, on the article card.
- The trigeminal explanation is described as the idea behind Neurolens, with symptoms that "may" result.
- "Lifetime satisfaction guarantee": now "backed by a 100% satisfaction guarantee", Neurolens's own wording. Return windows differ between providers, so no time period is given.

## Notes

- The article card images load from the site's Squarespace image library. If an image is replaced or deleted there, update its address in `neurolens.html`.
- The embed page is marked `noindex, indexifembedded`: search engines may index it as part of the Neurolens page, but not as a separate result.
- Fonts (Poppins and Urbanist, matching the site) are served with the page, not from Google.
- The trigeminal diagram (`img/trigeminal.webp`) is a still of the story's drawing. If the drawing in `nerves.js` changes, re-render it with `tools/trigeminal-figure.mjs` (instructions at the top of that file).
- Facts used in the trigeminal steps: an adult eye weighs about 7.5 g, and a standard plastic credit card (85.6 × 54 × 0.76 mm, PVC) about 5 g; the eye muscles have their own type of myosin (an extraocular-specific myosin), are packed with mitochondria and have a rich blood supply, which makes them very resistant to fatigue; eye muscle position information reaches the brainstem through the trigeminal nerve; it is sent with every eye movement, for everyone, so the story separates this normal traffic from the extra that holding misaligned eyes in line (fusional vergence) and correcting fixation disparity after each saccade are thought to add; the corrections themselves are driven mainly by vision (retinal disparity), so the story doesn't say the sensors drive them; the trigeminal nerve supplies the covering of the brain (the dura), and its brainstem nucleus extends into the upper cervical spinal cord, where it meets the C1 to C3 nerves (the trigeminocervical complex). The link between this and symptoms is described as the idea behind Neurolens ("thought to contribute").
