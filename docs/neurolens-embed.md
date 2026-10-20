# Neurolens page: one embed

`neurolens.html` replaces most of the Neurolens page (`calgaryvisioncentre.com/neurolens-calgary`) with a single, patient-friendly embed:

1. **See what your eyes are doing.** A click-through story on a 3D face, 17 short steps, each written across the forehead with its Back / Next buttons right there on the face:
   - Eyes look straight because the brain keeps the two eyes' information lined up. The target is a white ball on a vertical stick: it starts small, close to the face with the eyes turned in, then pulls back toward the viewer, dropping a little below the eye line, as the eyes straighten, so it's clear they are now looking far away. A ring on the ball shows where each eye is aiming. An eye that isn't used drifts to its resting position; where that is, and how well we cope with it, is the essence of BVD.
   - **Cover test, hands on:** the visitor drags a solid paddle over an eye, then clicks it to open an X-ray window and peek behind it: the covered eye has drifted (exophoric). They then cover the other eye and see the roles swap. On these steps Next becomes **Show me**, which does it for them.
   - Asleep, the eyelids close, then turn see-through (X-ray) to show both eyes turned out to rest. During every saccade the brain switches off the eyes' input (try it across the room, and in a mirror versus a phone's front camera), so the eyes start to drift and land slightly out of line.
   - **Reading** is a chain of saccades: at full speed (150 words a minute, true size) it looks normal; slowed down and magnified, the miss after each jump, fixation disparity, is clear. The last step points to the explanations below.
   - Also: Full speed / Slow motion while reading, and a link to show eyes that drift inward. Arrow keys step back and forth.
2. **Why small misalignments can cause symptoms:** the cause, the effect (with a simple trigeminal nerve diagram) and the solution, in plain language.
3. **Could Neurolens help you?** Certified provider, questionnaire button, booking button and phone number.
4. **Learn more from Dr Burke:** the four blog articles as cards.

## What to keep on the page

| Keep | Remove (now inside the embed) |
|---|---|
| The top video | "Neurolens utilizes patented technology…" heading |
| A short intro text block (below), for search engines | The intro paragraphs, and the 82% and "Flip your symptoms" images |
| The code block with the embed | The cause, the effect and the solution, with their images |
| The neurologist video and its caption, below the embed | The certified-provider line and the questionnaire button |
| | "Want to learn more", the logo, and the four article blocks |

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
