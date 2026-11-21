# Voice report journey

The report form is the landing page. Voice is one way to fill the answers. Tapping the same answers is the other. The microphone is on the form when `NEXT_PUBLIC_VOICE_UI=1`.

## Photo

The first step is a photo. The person takes one or chooses a file. The browser compresses it to at most 1280 px on the long edge and at most 256 KB.

## Answers

The person speaks or taps. The slots are:

1. Problem type: pothole, waterlogging, open or broken manhole, choked drain or nullah, road cave-in, broken paver blocks, or other.
2. When they noticed it. The five choices are Today, This week, This month, 1 to 6 months ago, and More than six months ago.
3. Whether it recurs.
4. An optional description.
5. A place pin. There is no default pin. They use their location, search for an area, or tap the map, then confirm the pin.

Voice does not ask whether they have seen an accident; the Check step asks it.

Speech-to-text is Sarvam `saaras` (code-mixed Hindi, Marathi, and English). The chat model writes slots with `save_issue_type`, `save_noticed_window`, `save_recurs`, `save_description`, and `propose_pin`. Replies are spoken with Sarvam `bulbul`. There is no submit tool.

Each voice turn has a 20 second budget and at most 3 model turns. Rate limits are per isolate. The verbatim transcript is stored and is never shown on a public page.

## Check

Check shows the photo and the answers. The person taps "Send report".

## Submitted

The Submitted screen links to `/map?report=<id>`, with that report highlighted on the map, and to the public page `/reports/<id>`.
