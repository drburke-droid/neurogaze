# Promotion kit: making the Gaze Simulator easy to find

Everything here is ready to paste into Squarespace or send.
The goal is a simulator that Google and interested visitors can find, without putting it in front of patients who don't care.

**The plan in one line:** give the simulator a real, text-rich page at `calgaryvisioncentre.com/gaze`, add five short condition pages that each open the simulator on a case, link to them quietly from relevant places, tell Google, and ask a few education sites to link to it.

## Checklist

1. Update the main page at `/gaze`: page text, search settings, social image, structured data (section 1).
2. Add five condition pages (section 2). Put them in the **Not Linked** area of the Pages panel. They stay public and searchable but stay out of your menu.
3. Add quiet links: footer, About Me, related service pages, and point the Vision Science Lab link at `/gaze` (section 3).
4. Submit the pages in Google Search Console (section 4).
5. Send the outreach messages (section 5).

Note: Squarespace usually only offers per-page code injection on Business plans and above. If you don't have it, put the structured-data block in a Code block at the bottom of the page instead; Google reads it there too.

---

## Embed code (use on every page)

This replaces your current code block. On the main page leave `START` empty. On a condition page, set `START` to that page's case; each one is given in section 2.

```html
<div id="gaze-sim" style="width:100%;"></div>
<script>
  (function () {
    var START = ""; // condition pages: e.g. "#case=cn6&side=R&gaze=4"
    var APP = "https://drburke-droid.github.io/neurogaze/";
    var ORIGIN = "https://drburke-droid.github.io";
    var box = document.getElementById("gaze-sim");

    var iframe = document.createElement("iframe");
    // Tell the simulator where it lives, and open the case in this page's address (or START)
    iframe.src = APP + "?embed=1&parent=" + encodeURIComponent(location.origin + location.pathname) + (location.hash || START);
    iframe.title = "Interactive Gaze Simulator by Dr Robert Burke";
    iframe.scrolling = "no";
    iframe.style.cssText = "display:block;width:100%;height:1100px;border:0;border-radius:12px;overflow:hidden;";
    iframe.setAttribute("allow", "fullscreen; clipboard-write; web-share");
    box.appendChild(iframe);

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN || !e.data) return;
      // The simulator reports its full height, so this page does all the scrolling
      if (e.data.type === "gaze-height") iframe.style.height = e.data.height + "px";
      // Keep this page's address in sync with the case on screen, so copied links reopen it
      if (e.data.type === "gaze-hash" && e.data.hash !== location.hash) history.replaceState(null, "", e.data.hash);
    });
  })();
</script>
```

---

## 1. Main page: `calgaryvisioncentre.com/gaze`

### Page settings (gear icon → SEO and Social Image)

| Field | Paste this |
|---|---|
| Page title (navigation) | Gaze Simulator |
| URL slug | gaze |
| SEO title | Eye Movement & Cranial Nerve Palsy Simulator · Calgary Vision Centre |
| SEO description | Free 3D simulator of the extraocular muscles and cranial nerves III, IV and VI. See sixth, fourth and third nerve palsy, INO and thyroid eye disease in the nine positions of gaze. |
| Social image | Upload `og-image.jpg` from the repository (download link below) |

Download: `https://drburke-droid.github.io/neurogaze/og-image.jpg`

### Page content

Put a **Text block** above the code block with this:

> # Interactive Gaze Simulator
>
> A free 3D teaching model of how the eyes move, created by Dr Robert Burke, optometrist at Calgary Vision Centre. Move the target and watch both eyes follow, then apply a sixth, fourth or third nerve palsy, internuclear ophthalmoplegia, thyroid eye disease or another eye-movement disorder and see how the eyes behave in each direction of gaze.
>
> There are two modes. The **Simulator** lets you explore a condition. The **Motility chart** works the other way round: record where each eye pointed in the nine positions of gaze and it suggests which conditions best fit.

Then the **Code block** with the embed code above (START left empty).

Then a **Text block** below the simulator:

> ## Who it is for
>
> Optometry, ophthalmology and neurology students learning the extraocular muscles and cranial nerves, and clinicians explaining double vision to patients.
>
> ## How to use it
>
> - Move your pointer over the face, drag with a finger, or use the 3×3 pad to look in the nine diagnostic positions.
> - Pick a condition and the affected side. Each one has a short teaching card with the signs and the red flags.
> - Click the face to lock the gaze; press and hold the face to compare with a healthy patient.
> - Switch the fixing eye to see the larger secondary deviation, or switch to a near target to see convergence.
> - Every case has its own link, so you can share exactly what you are looking at.
>
> ## Conditions
>
> - [Sixth nerve palsy](/sixth-nerve-palsy-simulator): the eye cannot turn out.
> - [Fourth nerve palsy](/fourth-nerve-palsy-simulator): the eye rides high, worst looking down and in.
> - [Third nerve palsy](/third-nerve-palsy-simulator): ptosis, a dilated pupil and an eye that rests down and out.
> - [Internuclear ophthalmoplegia](/internuclear-ophthalmoplegia-simulator): one eye fails to adduct on side gaze.
> - [Thyroid eye disease](/thyroid-eye-disease-eye-movements): tight muscles limit elevation and abduction.
> - Also in the simulator: orbital floor fracture, Brown syndrome, Duane syndrome, cavernous sinus syndrome, myasthenia gravis, Miller Fisher syndrome and skew deviation.
>
> ## About the model
>
> This is a qualitative teaching model, not a biomechanical simulation. It keeps eye movements within normal ranges, separates weak muscles from tight ones, and applies Hering's law through the fixing eye. It does not model pupil light reactions, torsion or head tilt.
>
> *Educational use only. This simulator does not examine anyone's eyes and is not a diagnostic tool. New double vision, a drooping eyelid, a change in pupil size, or eye-movement problems with headache, weakness or dizziness need urgent medical assessment.*

### Structured data (Page settings → Advanced → Page Header Code Injection)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": ["WebApplication", "LearningResource"],
  "name": "Interactive Gaze Simulator",
  "url": "https://calgaryvisioncentre.com/gaze",
  "image": "https://drburke-droid.github.io/neurogaze/og-image.jpg",
  "description": "Free interactive 3D teaching model of the extraocular muscles and cranial nerves III, IV and VI, showing nerve palsies, INO, restrictive and supranuclear disorders in the nine diagnostic positions of gaze.",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Any (web browser)",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "educationalLevel": "Optometry, ophthalmology and neurology students and clinicians",
  "learningResourceType": "Simulation",
  "teaches": ["Extraocular muscle actions", "Cranial nerve palsies", "Diagnostic positions of gaze", "Hering's law"],
  "author": {
    "@type": "Person",
    "name": "Dr Robert Burke",
    "jobTitle": "Optometrist",
    "worksFor": { "@type": "Optician", "name": "Calgary Vision Centre", "url": "https://calgaryvisioncentre.com/", "address": { "@type": "PostalAddress", "addressLocality": "Calgary", "addressRegion": "AB", "addressCountry": "CA" } }
  }
}
</script>
```

---

## 2. Five condition pages

Create each as a new page in the **Not Linked** section. Each page has three parts:
- a Text block with the copy;
- a Code block with the embed code and `START` set as given;
- a closing Text block linking back to `/gaze`.

Upload the matching social image from `https://drburke-droid.github.io/neurogaze/share-images/<file>`.

Use the closing block on every condition page:

> [Open the full simulator](/gaze) · [Sixth](/sixth-nerve-palsy-simulator) · [Fourth](/fourth-nerve-palsy-simulator) · [Third](/third-nerve-palsy-simulator) · [INO](/internuclear-ophthalmoplegia-simulator) · [Thyroid eye disease](/thyroid-eye-disease-eye-movements)
>
> *Educational simulation by Dr Robert Burke, optometrist, Calgary Vision Centre. Not a diagnostic tool. If you have new double vision or a drooping eyelid, see an eye doctor promptly.*

### 2a. Sixth nerve palsy

| Field | Paste this |
|---|---|
| URL slug | sixth-nerve-palsy-simulator |
| SEO title | Sixth Nerve Palsy Simulator: Abducens Palsy in 3D |
| SEO description | See a sixth nerve (abducens) palsy in 3D: the eye cannot turn out, and the esotropia grows toward the affected side. Free teaching simulator. |
| Social image | `sixth-nerve-palsy.jpg` |
| `START` | `#case=cn6&side=R&gaze=4` |

> # Sixth nerve palsy simulator
>
> The sixth cranial nerve (abducens) supplies the lateral rectus, the muscle that turns the eye outward. When it fails, the medial rectus pulls the eye in. The result is an esotropia that is largest when looking toward the affected side and small or absent looking away, with horizontal double vision that is worse at distance. Many patients turn their face toward the affected side to keep single vision.
>
> The simulator below opens on a right sixth nerve palsy with the patient looking right. Move the target across the face to see how the deviation changes, and switch the fixing eye to the right to see the larger secondary deviation predicted by Hering's law.
>
> **Causes clinicians consider:** microvascular disease (diabetes, hypertension), raised intracranial pressure (a "false-localising" sign, so check for papilloedema), trauma, skull base lesions, and demyelination in younger adults. A sixth nerve palsy in a child, or in an adult without vascular risk factors, needs investigation.

### 2b. Fourth nerve palsy

| Field | Paste this |
|---|---|
| URL slug | fourth-nerve-palsy-simulator |
| SEO title | Fourth Nerve Palsy Simulator: Superior Oblique Palsy in 3D |
| SEO description | See a fourth nerve (trochlear) palsy in 3D: a hypertropia that grows in opposite gaze and downgaze. Free teaching simulator with the nine positions of gaze. |
| Social image | `fourth-nerve-palsy.jpg` |
| `START` | `#case=cn4&side=R&gaze=3` |

> # Fourth nerve palsy simulator
>
> The fourth cranial nerve (trochlear) supplies the superior oblique, which depresses the eye when it is turned in toward the nose and also intorts it. When it is weak, the affected eye rides higher. The vertical deviation grows when looking to the opposite side and down, and is largest looking down and in. Patients often tilt their head to the opposite shoulder and notice double vision when reading or on stairs.
>
> The simulator below opens on a right fourth nerve palsy with the patient looking down and to the left, where the right eye fails to follow.
>
> **Causes clinicians consider:** head trauma (often affecting both sides), a congenital palsy that has started to decompensate (old photographs with a head tilt are a clue), and microvascular disease. The Parks–Bielschowsky three-step test helps confirm it; head tilt is not shown in this model.

### 2c. Third nerve palsy

| Field | Paste this |
|---|---|
| URL slug | third-nerve-palsy-simulator |
| SEO title | Third Nerve Palsy Simulator: Ptosis, Pupil and Down-and-Out Eye |
| SEO description | See a third nerve (oculomotor) palsy in 3D: ptosis, a dilated pupil and an eye that rests down and out. Compare pupil-involving and pupil-sparing palsies. |
| Social image | `third-nerve-palsy.jpg` |
| `START` | `#case=cn3&side=R&gaze=5` |

> # Third nerve palsy simulator
>
> The third cranial nerve (oculomotor) supplies four of the six eye muscles, the muscle that lifts the upper lid, and the pupil constrictor. A complete palsy leaves only the lateral rectus and superior oblique working, so the eye rests down and out, the lid droops, and the pupil may be dilated. Adduction, elevation and depression are all limited.
>
> The simulator below opens on a right third nerve palsy with ptosis and a dilated pupil. In the nerve panel, switch the right pupil to normal to compare a pupil-sparing palsy, or change the amount of ptosis.
>
> **Red flag:** a third nerve palsy with a dilated pupil, or with pain, is treated as a posterior communicating artery aneurysm until proven otherwise and needs same-day imaging. Pupil-sparing palsies in people with vascular risk factors are often microvascular but still need close follow-up.

### 2d. Internuclear ophthalmoplegia

| Field | Paste this |
|---|---|
| URL slug | internuclear-ophthalmoplegia-simulator |
| SEO title | Internuclear Ophthalmoplegia (INO) Simulator in 3D |
| SEO description | See internuclear ophthalmoplegia in 3D: one eye fails to adduct on side gaze while the other shows nystagmus, and convergence is spared. Free teaching simulator. |
| Social image | `internuclear-ophthalmoplegia.jpg` |
| `START` | `#case=ino&side=R&gaze=6` |

> # Internuclear ophthalmoplegia (INO) simulator
>
> In INO, a lesion of the medial longitudinal fasciculus in the brainstem disconnects the two eyes during side gaze. When looking away from the lesion, the eye on the lesion side fails to turn in (or turns in slowly), while the other eye shows nystagmus as it turns out. The muscles themselves are normal, so convergence is usually spared, and the eyes are usually straight in primary position.
>
> The simulator below opens on a right INO with the patient looking left. Switch the target to Near to see that convergence still works.
>
> **Causes clinicians consider:** multiple sclerosis in younger patients (often both sides), and brainstem stroke in older patients (usually one side).

### 2e. Thyroid eye disease

| Field | Paste this |
|---|---|
| URL slug | thyroid-eye-disease-eye-movements |
| SEO title | Thyroid Eye Disease Eye Movements: Restrictive Strabismus in 3D |
| SEO description | See how thyroid eye disease restricts eye movements: limited elevation and abduction with hypotropia. Free 3D teaching simulator comparing restriction with palsy. |
| Social image | `thyroid-eye-disease.jpg` |
| `START` | `#case=ted&side=R&gaze=7` |

> # Thyroid eye disease eye movements
>
> In thyroid eye disease the eye muscles become enlarged and later fibrotic. The problem is restriction, not weakness: a tight muscle acts like a tether and stops the eye moving away from it. The inferior rectus is affected most often, then the medial rectus, so elevation and abduction are limited and the affected eye sits lower and slightly in.
>
> The simulator below opens on right thyroid eye disease with the patient looking up and to the right. Compare it with a nerve palsy in the simulator to see the difference between a tight muscle and a weak one.
>
> **Red flag:** reduced vision, faded colours or a relative afferent pupillary defect can mean the optic nerve is being compressed, which is an emergency.

---

## 3. Quiet links

**Footer** (Squarespace footer → add a Text or Code block):

```html
<a href="/gaze">Eye Movement Simulator</a>
```

**About Me page**, next to the Vision Science Lab link:

> I also built an [interactive eye-movement simulator](/gaze) for students and colleagues; it lives in the Vision Science Lab, too.

**Related service pages** (binocular vision, double vision, neuro-optometry, concussion), one line where it fits naturally:

> Curious how the eye muscles work? Try our free [3D eye-movement simulator](/gaze).

**Vision Science Lab:** make the simulator's retro link point to `https://calgaryvisioncentre.com/gaze`, so people and search engines arrive at the same page.

---

## 4. Google Search Console

1. Go to search.google.com/search-console and add `calgaryvisioncentre.com` as a property. Squarespace can verify it for you under Settings → Connected accounts → Google Search Console.
2. Under **Sitemaps**, submit `https://calgaryvisioncentre.com/sitemap.xml`. Squarespace keeps it up to date, including Not Linked pages.
3. Paste each new URL into the **URL inspection** bar and click **Request indexing**:
   - `/gaze`
   - `/sixth-nerve-palsy-simulator`
   - `/fourth-nerve-palsy-simulator`
   - `/third-nerve-palsy-simulator`
   - `/internuclear-ophthalmoplegia-simulator`
   - `/thyroid-eye-disease-eye-movements`
4. After a few weeks, open **Performance → Search results** to see which searches bring people in. That tells you which condition page to add next.

---

## 5. Outreach

Links from schools and professional sites are the single biggest boost for a niche tool. A handful is enough.

### Email to optometry and ophthalmology programs

Send it to the course coordinator for ocular motility or binocular vision, or the residency director. In Canada, start with the University of Waterloo School of Optometry and Vision Science and the École d'optométrie at the Université de Montréal. Then try ophthalmology residency programs.

> **Subject:** Free 3D eye-movement simulator for teaching cranial nerve palsies
>
> Dear Dr ___,
>
> I'm an optometrist at Calgary Vision Centre and I've built a free, browser-based 3D simulator of the extraocular muscles and cranial nerves III, IV and VI. Students can move the target through the nine diagnostic positions and see sixth, fourth and third nerve palsies, INO, thyroid eye disease, Brown and Duane syndrome, with Hering's law, ptosis and pupil involvement shown. A second mode lets them chart a motility exam and see which conditions fit.
>
> Each case has its own link, so it can be dropped into lecture slides or an LMS. For example, this opens a right sixth nerve palsy: https://calgaryvisioncentre.com/gaze#case=cn6&side=R&gaze=4
>
> If you think it would help your students, I'd be grateful if you shared it or added it to your course resources. I'd also welcome any corrections.
>
> Kind regards,
> Dr Robert Burke
> Calgary Vision Centre

### Note for professional associations (newsletter or member resources)

> Calgary optometrist Dr Robert Burke has released a free 3D simulator of eye movements and cranial nerve palsies for students and clinicians. It shows sixth, fourth and third nerve palsies, INO and thyroid eye disease in the nine positions of gaze, and can suggest likely diagnoses from a charted motility exam. Try it at calgaryvisioncentre.com/gaze.

### Reddit (r/optometry, r/Ophthalmology, r/medicalschool)

Check each subreddit's self-promotion rules first, and post as yourself.

> **Title:** I made a free 3D simulator for learning cranial nerve palsies and the nine positions of gaze
>
> Optometrist here. I built this to teach EOM actions and CN III/IV/VI palsies: you move the target and watch both eyes, switch the fixing eye to see secondary deviation, and there's a "motility chart" mode where you drag each eye to match an exam and it suggests what fits. Ptosis and pupil are shown for third nerve palsy. It's free and runs in the browser: calgaryvisioncentre.com/gaze
>
> Feedback and corrections very welcome. It's a teaching model, so I'd love to hear where it doesn't match what you see clinically.

### LinkedIn, Facebook or Instagram

> Students and colleagues: I've built a free 3D eye-movement simulator. Pick a cranial nerve palsy, move the target, and watch both eyes respond in all nine positions of gaze, or chart an exam and see which conditions fit. Try it: calgaryvisioncentre.com/gaze
> #optometry #ophthalmology #neuroophthalmology #meded

Attach one of the share images. They make a strong post image.

### EyeWiki

EyeWiki articles are written by ophthalmologists, so you can't add a link yourself. If you know an ophthalmologist who contributes, ask whether the simulator would suit the External links section of the sixth, fourth or third nerve palsy articles.

---

## What not to do

- **Don't add it to the main navigation.** Most patients don't need it, and the quiet links are enough for search.
- **Don't publish copies elsewhere,** such as a second Squarespace page or a separate site. Keep `/gaze` as the one home and point everything at it.
- **Don't let the condition pages drift apart from the simulator.** If you change a condition's wording in the simulator, update its page too.
