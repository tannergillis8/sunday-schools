# Pro-Football-Reference data

Copied from pro-football-reference.com with the WebFetch tool (no scraping scripts).

- `<year>.csv`: draft tables. Only the first ~100-110 picks of each year, because the fetch tool cuts the page off there.
  Columns: pick, player, pos, AP1 (first-team All-Pro, career), PB (Pro Bowls, career), St (seasons as a starter), wAV (weighted approximate value), G (games), college.
- `allpro.csv`: first- and second-team All-Pro selections, seasons 2011-2025.
- `probowl.csv`: Pro Bowl selections, seasons 2011-2015 and 2018-2025. The 2016 and 2017 pages did not return a Pro Bowl list, so those seasons are missing.
  The `conf` column is unreliable for 2013-2015 (it holds captain names). It is not used.
- `probowl-2016-2017-supplement.csv`: Pro Bowl linemen, kickers, punters and long snappers for the 2016 and 2017 seasons, from Wikipedia's 2017 and 2018 Pro Bowl pages, because the Pro-Football-Reference pages for those two seasons did not return a Pro Bowl list. Other positions are not included.
