# Fixation disparity demo for the Neurolens page

An interactive companion to the Gaze Simulator. It shows the eyes landing slightly out of line after each saccade and while reading, the eye-muscle proprioceptors reporting the error by the proposed trigeminal route, and the correction that realigns the eyes. A load meter shows the proposed cumulative effect, with other stressors (weather change, stress, poor sleep) added in.

Visitors can enter their own Neurolens distance and near measurements. If they don't know them, it shows a typical exo posture (1Δ exo at distance, 4Δ exo at near), with a switch to a typical eso posture (2Δ eso at both).

Standalone address: `https://drburke-droid.github.io/neurogaze/neurolens.html`

## Embed code

Paste this into a **Code block** on the Neurolens page. It sizes itself to its content, so the page does all the scrolling.

```html
<div id="fd-demo" style="width:100%;"></div>
<script>
  (function () {
    var APP = "https://drburke-droid.github.io/neurogaze/neurolens.html";
    var ORIGIN = "https://drburke-droid.github.io";
    var box = document.getElementById("fd-demo");

    var iframe = document.createElement("iframe");
    iframe.src = APP + "?embed=1&parent=" + encodeURIComponent(location.origin + location.pathname);
    iframe.title = "Fixation disparity and the trigeminal nerve: interactive demo by Dr Robert Burke";
    iframe.scrolling = "no";
    iframe.style.cssText = "display:block;width:100%;height:1150px;border:0;border-radius:12px;overflow:hidden;";
    iframe.setAttribute("allow", "fullscreen");
    box.appendChild(iframe);

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN || !e.data || e.source !== iframe.contentWindow) return;
      // The demo reports its full height, so this page does all the scrolling
      if (e.data.type === "gaze-height") iframe.style.height = e.data.height + "px";
    });
  })();
</script>
```

When embedded, the demo hides its own explanation and footer and shows a one-line note instead, so the page's own text can do the explaining.

## Suggested text around it

Above the demo:

> ## See what your eyes are doing
>
> Every time your eyes move to a new word, they have to land together on exactly the same spot. If their natural resting position is slightly out of line, they can land a little off target and need a small correction, thousands of times a day. Press **Reading** to watch it in slow motion, or use the cover paddle to see where your eyes drift when they are not working together.

Below the demo:

> *This animation illustrates a proposed mechanism. The role of the trigeminal nerve in eye strain, headaches and neck tension is still being researched, the eye movements are magnified so they can be seen, and the load meter is illustrative rather than a measurement. A full eye examination is the way to find the cause of frequent headaches or eye strain.*

## Notes

- **Wording.** The demo describes the trigeminal route and the load as proposed, and says the symptoms "may" appear. Keep the page text in the same register: describe the idea and invite people to be assessed, without promising an outcome.
- **Search.** The demo page is marked `noindex, indexifembedded`: search engines may index it as part of the Neurolens page that embeds it, but not as a separate result.
- **What it does not show.** Vertical misalignment, the prism itself, and real-time speed (the steps are slowed and separated for clarity).
