# Alice illustrated covers

The Alice theme assigns one of **34 individual WebP book illustrations** to each book using a stable hash of its ID. Personalized image covers saved in `S.covers` always take precedence.

## Asset install

The image files are supplied separately in `readquest_alice_34_covers_for_github.zip`. Copy all `skins/alice-covers/01.webp` through `34.webp` from that ZIP into this repository branch and commit them before merging PR #6.

Required filename scheme: `skins/alice-covers/NN.webp` for NN from 01 to 34.

Images are 480×720 WebP at quality 82. Asset collection is approximately 4.65 MiB. Files are intentionally *not* on the GitHub branch yet because the available GitHub integration cannot read the image bytes from the ChatGPT workspace directly. Until they are uploaded, the app will fall back to its earlier lightweight vector jackets.

## Verification

1. Switch to `Алиса в стране чудес` from the skin picker.
2. Confirm book tiles show 34 possible illustrated variants without added lettering.
3. Confirm the same book retains its artwork after reload and across day/night modes.
4. Confirm user-uploaded covers still override theme art.
5. Disable network after first load and inspect PWA behavior (note: no bulk precache of image pack has been added).
