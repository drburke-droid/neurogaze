# Neurolens page: one embed

`neurolens.html` replaces most of the Neurolens page (`calgaryvisioncentre.com/neurolens-calgary`) with a single, patient-friendly embed:

1. **See what your eyes are doing.** A click-through story on a 3D face, 34 short steps, each written across the forehead with its Back / Next buttons right there on the face:
   - Eyes look straight because the brain keeps the two eyes' information lined up. The target is a white ball on a vertical stick: it starts small, close to the face with the eyes turned in, then pulls back toward the viewer, dropping a little below the eye line, as the eyes straighten, so it's clear they are now looking far away. A ring on the ball shows where each eye is aiming. An eye that isn't used drifts to its resting position; where that is, and how well we cope with it, is the essence of BVD.
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
3. **A neurologist's view:** Dr. Carol Nelson's video, click to play, streamed from the site's Squarespace video library.
4. **Could Neurolens help you?** Certified provider, questionnaire button, booking button and phone number.
5. **Learn more from Dr Burke:** the four blog articles as cards.

## What to keep on the page

| Keep | Remove (now inside the embed) |
|---|---|
| The top video | "Neurolens utilizes patented technology…" heading |
| A short intro text block (below), for search engines | The intro paragraphs, and the 82% and "Flip your symptoms" images |
| The code block with the embed | The cause, the effect and the solution, with their images |
| The neurologist video block, anywhere on the site (see below) | The certified-provider line and the questionnaire button |
| | "Want to learn more", the logo, and the four article blocks |
| | The neurologist video and its caption on this page (it plays inside the embed) |

**Keep the neurologist video in a block somewhere on the site.** The embed streams it from the site's Squarespace video library, and Squarespace stops serving a video that isn't used in any block. If you take it off the Neurolens page, put it on a page that isn't linked from the menu (in Pages, under "Not linked"). If you ever replace or delete that video in Squarespace, the address in `neurolens.js` (`NEURO_VIDEO`) needs updating.

Suggested intro text block (keeps the page's main words in the page itself, which search engines weigh most):

> # What is Neurolens®?
>
> Neurolens® glasses add a small, precisely measured amount of contoured prism to your prescription to help your eyes line up. They're designed for people whose eyes rest slightly out of line, which can contribute to headaches, neck pain, eye strain and a dry-eye feeling, especially after screen time.

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
    iframe.title = "Neurolens: see what your eyes are doing";
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
