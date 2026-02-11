Yes—there’s real demand for “unified fitness/biometrics across multiple vendors,” but it’s not a wide mainstream market yet. It’s a meaningful niche with several proven paid products, and the biggest risk is not demand—it’s execution and vendor/API friction.

## Evidence there’s demand (people already pay for this)

Multiple established products exist specifically because users want cross-device aggregation:

* **Runalyze** positions itself as a cross-vendor analysis hub and explicitly supports a long list that overlaps with your P0–P2 set (Garmin, Polar, Suunto, COROS, Wahoo, Oura, Strava, WHOOP, Fitbit, etc.). ([Runalyze][1])
* **FitnessSyncer** markets a unified dashboard + syncing across “50+ providers,” and has existed for years. ([FitnessSyncer][2])
* **Exist.io** is a “bring your data together” quantified-self service that imports from Apple Health/Health Connect, Garmin, Oura, Strava, Fitbit, Withings, etc. ([Exist][3])
* **Heads Up Health** (more clinical/longevity oriented) sells “one longitudinal view” by integrating Apple Health, Garmin, Oura, etc. ([Heads Up Health][4])
* On iOS, **HealthFit** is popular mainly as an “export/bridge” tool because the ecosystem is fragmented and people need escape hatches (FIT export, syncing to other platforms). ([App Store][5])

Also: threads in quantified-self / running communities routinely discuss fragmented stacks (Garmin + Strava + Runalyze, etc.), which is a strong signal that “no unified view” is a real pain. ([Reddit][6])

## The uncomfortable truth: your exact idea already exists (very close)

A project called **Open Wearables** launched recently that is extremely similar to your description: self-hosted, unified API, normalizes data across Garmin/Apple Health/Oura/Whoop/Strava, etc. ([openwearables.io][7])
It’s even being shared in self-hosted communities. ([Reddit][8])

That doesn’t mean “don’t do OpenFit,” but it does mean:

* you must **differentiate sharply**, or
* you should **build on / contribute to / fork** an existing base to win on speed and community.

## Who would use OpenFit (realistic target segments)

1. **Data-ownership + self-hosted users** (Home Assistant-ish mindset): small but vocal; will tolerate rough edges if you deliver privacy + export + control.
2. **Serious athletes with multi-device setups** (Garmin + Oura + Whoop): they already juggle tools; they’ll switch if you deliver *better analytics and de-duplication* than Runalyze/Intervals/TrainingPeaks-style tooling.
3. **Developers / researchers / clinics** who need unified ingestion (B2B-ish): they care about schema, reliability, audit/provenance, and “weeks saved integrating wearables.” (This is where Open Wearables is positioning.) ([HIT Consultant][9])

Mainstream casual users are harder: most just accept Apple Health / Google Health Connect / vendor apps, and won’t self-host.

## The biggest blockers (why this is hard even if demand exists)

* **API policy limits + instability**: you noted Strava restrictions; this kind of limitation is common and can change. (Even “syncing stopped working” complaints show up when platforms tighten writes.) ([Fitbit Community][10])
* **Long-tail integration maintenance** is relentless: auth changes, rate limits, vendor schema drift, 2FA flows, occasional breakage.
* **Data semantics are messy**: “HRV” and “sleep score” are not the same across vendors; cross-device “normalization” can easily become misleading unless you communicate uncertainty/confidence and keep vendor-native values accessible.

## If you want this to win, the differentiator can’t be “unify data”

Because competitors already unify data, the differentiators that could actually make OpenFit compelling are things like:

* **Best-in-class cross-device de-duplication and provenance** (e.g., the same activity recorded by watch + bike computer + Strava upload).
* **Correlation that’s genuinely useful** (not just charts): automated “what changed?” detection across sleep/training load/resting HR with transparent methodology.
* **Local-first / offline-first ingestion** (Gadgetbridge/Health Connect emphasis) plus strong privacy guarantees.
* **A published schema that becomes the default interchange** (hard, but valuable if you can get community adoption).

## Bottom line (honest take)

* **Yes, people would use it**, but the core user base is **niche** unless you also aim at devs/clinics. The niche is still large enough to support an open-source project with a hosted tier (Runalyze/FitnessSyncer/Exist/Heads Up Health demonstrate willingness to pay). ([Runalyze][11])
* **The market is crowded enough that “unified dashboard” is not new**. The more serious concern is that a very similar open-source entrant exists already (Open Wearables). ([GitHub][12])
* If OpenFit proceeds, it should pick a lane:

  * **Self-hosted quantified-self power tool** with unmatched data control and analytics, *or*
  * **Developer-grade ingestion + schema standard** (B2B-ish), *or*
  * a hybrid, but then you’ll need to be ruthless about MVP scope.

If you want, I can propose 2–3 concrete positioning options (and an MVP feature set for each) that clearly differentiates from Runalyze/FitnessSyncer/Exist and from Open Wearables.

[1]: https://runalyze.com/?_locale=en&utm_source=chatgpt.com "RUNALYZE - Data analysis for athletes"
[2]: https://www.fitnesssyncer.com/?utm_source=chatgpt.com "FitnessSyncer joins your health and fitness clouds into one ..."
[3]: https://exist.io/apps-data-syncing/?utm_source=chatgpt.com "What data can you bring to Exist?"
[4]: https://headsuphealth.com/heads-up-health/?utm_source=chatgpt.com "Heads Up Health - The Ultimate Health Dashboard"
[5]: https://apps.apple.com/us/app/healthfit/id1202650514?utm_source=chatgpt.com "HealthFit - App Store - Apple"
[6]: https://www.reddit.com/r/running/comments/u2ux2m/app_data_geeks_what_is_your_stack/?utm_source=chatgpt.com "App & data geeks - what is your stack? : r/running"
[7]: https://openwearables.io/?utm_source=chatgpt.com "Open Wearables - Unified Health Data Platform"
[8]: https://www.reddit.com/r/selfhosted/comments/1pqp8pm/open_wearables_selfhosted_open_source_platform/?utm_source=chatgpt.com "self-hosted open source platform for wearable data ..."
[9]: https://hitconsultant.net/2025/12/08/momentum-launches-open-wearables-the-first-open-source-api-unifying-200-health-devices/?utm_source=chatgpt.com "Momentum Launches 'Open Wearables': The First ..."
[10]: https://community.fitbit.com/t5/Third-Party-Integrations/Third-party-syncing-no-longer-working/td-p/5236283?utm_source=chatgpt.com "Solved: Third party syncing no longer working - Fitbit Community"
[11]: https://runalyze.com/help/article/how-to-import-activities-and-health-data?utm_source=chatgpt.com "How to Import Activities and Health Data into Runalyze"
[12]: https://github.com/the-momentum/open-wearables?utm_source=chatgpt.com "the-momentum/open-wearables: Self-hosted platform to ..."
