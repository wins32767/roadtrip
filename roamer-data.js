/* ═══════════════════════════════════════════════════════
   ROAMER — Route data
   Add new routes here. Index 0 is always Today's Daily Route.
   pack: "winter" | "grand"  (controls which screen they appear on)
   ═══════════════════════════════════════════════════════ */

const DAILY_INDEX = 0;

const ROUTES = [
  {
    name: "Southwest Desert Loop", pack: "winter", region: "US Southwest",
    stops: [
      { name: "Las Vegas, Nevada", lat: 36.164488, lng: -115.128479, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepTPCq8NJF8vybGVRlw7FrAQXRlpGxp4Dmv_wfka_SCQLC6mGYWKavyQS3YAC_6EZYj_HO5bUtl47RUch-KhRc3AkMU0xTpNRsM3Y184oeRC45Mvo9vtaHAHdO1Z_7u78nZhCQ2Gw=w408-h291-k-no" },
      { name: "Zion National Park", lat: 37.295906, lng: -113.035584, photo: "https://upload.wikimedia.org/wikipedia/commons/1/10/Zion_angels_landing_view.jpg" },
      { name: "Arches National Park", lat: 38.744574, lng: -109.57467, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwermOBKh6uMuLZzcagmQy7Yt2cpUOTD_wFh1Ke5FkeAGE1WWx_-r8N7DoeCIIZeL2o5ZvfBWOCR0iKn7uJ1_aP3I60lH6iP8RiADqDTnthHsafDAzyGAecwUPyD9l5fzMjsVrBgS=w408-h306-k-no" },
      { name: "Monument Valley", lat: 37.16664283618822, lng: -110.09558810001396, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepwDxUImUXx47AgeLo9k6jLyIeTOU1XPXn1ZJE9tROOzBXCU9Mj4kHBsz8B5ft43TbleL3zjPGy7EbB_vFG0l_M_ZHI5IrCKxNW0PgJA9ePe0Sq8VT9PS6TdryUySu6950GDcLBrQ=w408-h306-k-no" },
      { name: "Horseshoe Bend", lat: 36.877049, lng: -111.502171, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerM36eKL3_jgoEEdMXira-eampFkeyMmcQWW7-Sasr0Wj46LFEvvcHIsDDeons7Ra30LMPXTFtL7iK7tggYACXZW2Pi6ZGno39OkfcC9434eKvw3mjMaxuHc6x9jzROpdYAWyIKZQ=w408-h358-k-no" },
      { name: "Grand Canyon South Rim", lat: 36.130936, lng: -112.12099, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweprgG_sUwAZ4uHnxXzly6oeM1AhYMo89Qp0wwQeW4-Wdgn4jZFyX1kUGwEdSEhmSkjBZKZ2336GCY6vAf778Rvko7OrDL7PmhObIleIoQvZNgNyeD7qIJ0Zl8d-UTtWpELOw3x1IJl8YMn0=w408-h306-k-no" },
    ],
    travelTimes: ['2h 45m','4h 15m','2h 15m','1h 30m','1h 15m'],
    decoys: [
      { name: "Yellowstone National Park", photo: "https://upload.wikimedia.org/wikipedia/commons/5/51/Yellowstone_National_Park_%28WY%2C_USA%29%2C_Old_Faithful_Geyser_--_2022_--_2599.jpg" },
      { name: "Sequoia National Park", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqk4OU-Os2qbRJZjsXJJmV7ivsBzpehRV20m_UFR0_OHOs8i02suWbH6iuIB0U8NopsZTGiKpNY-5WtYiAcMhiP7rktEQHt-CFS4lbfzIH4JkM5zFjxO91c3BM168tZ8aDdEPVG=w408-h608-k-no" },
      { name: "Yosemite", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwer6tl2lVcUSpnsD5ZGUib9Bin2QkdysQdMCjZgK00ohyAGdxvHAeEWzlNzEH6Ru_r4oB91qxqEP2D6c7_el8wRs3s9R1iWfGzr8MH0_wgjNV7i3150Xu_lXmIrR7vvsn-_QCOEe=w408-h306-k-no" },
    ],
  },
  {
    name: "Italian Riviera to Amalfi", pack: "winter", region: "Italy",
    stops: [
      { name: "Genoa, Italy", lat: 44.40754258102606, lng: 8.940124471348321, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwer9lvmoOUjQCqR4mmS2jbk-u2ejrkolLViHH-GkOlZ1ZDKIrC62nQwD7jIXNSDOiaL7isslp_q1mGKK8d9_BdqZH8VLHnuSlnIR8anDYj3dBap0_L9Y88xoqY1p3k3vvl9lWxlkMw=w408-h272-k-no" },
      { name: "Pisa, Italy", lat: 43.751257203661766, lng: 10.401305832515899, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweoFaoInfakUve-dap8abdltEOrjSJ9rOuFsDJ6G-ZwKT9JdH_XWLthKq3s0c8TCbkELExesdXLk4EcDZiMHkrExol0A_8eao6DCKiHCqkfeXMy0b4l2DnlTqhhdoSXyqzaRCgee=w408-h306-k-no" },
      { name: "Florence, Italy", lat: 43.790923852925694, lng: 11.29119834714566, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepnlVtJ-1XtrKBZiyDaYH7YPXRLJrzTXCd5foqvqfJwazP5dBayidew84XI9ouGm4IHMWFx3zJ50HYa9lY-lNynWGuqg76ebABavy1GDT0wU8nATMO-dSnim97TESs8j7MMFxZ7Q=w408-h306-k-no" },
      { name: "Rome, Italy", lat: 41.89639505372268, lng: 12.485412492059577, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweppOiNQIn3_14fNZOuaQnuuP3TIw1HX7qbdV0yJJhH1G0JpRxf3aBf-wVfrIpjxVMztOE8NZkcATsUh7T4NGP4_un_Gf6cA6iUPRXg5FaZHc_TV699d7HC5qoaRXhRaglbvzn-B=w600-h424-p-k-no" },
      { name: "Naples, Italy", lat: 40.8678338527714, lng: 14.268493263533424, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwersBXNRljietq1UgHAQktcLSjCbYjd55984vizOXxT80aJH1bqh9uL8V2eU-zzkfqHNWK9eHt7CzdTAHUB9EMd4mIjosyXBg4CEyO1linyQodRgdlH2eTrmDDFnRzceoCTMdXsf=w408-h306-k-no" },
      { name: "Salerno, Italy", lat: 40.69711762616485, lng: 14.774355669647283, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqzcWSjO4lAh9WfzJf1sb05-fsjyRj2sri4M05Tu67APhUUYUzIE4Eqm9AyY9S7hJNArxF33XndNF1gFtmbAoE72ze4yUEpHVGHoTIUDq1gUmxFZBW249hHQVxT_-lwI2zEzOiQmA=w426-h240-k-no" },
    ],
    travelTimes: ['1h 45m','1h','3h','2h 15m','0h 30m'],
    decoys: [
      { name: "Venice, Italy", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerTZvLypPF2eMASehYXLrdahoYALXQ0UR3h2nYczXWxK6e-GPxAAl5ItZtgpR_qxlfFCsVkgtZF4B-YAJKVmjpar0DaxRAGSwUF8Z15AIBifw3FNB-gf5somlAbotNinMLHhLdruA=w408-h306-k-no" },
      { name: "Monaco", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepSyOLH7Pl1tQz0zeUVZmxn0lluwMZTRvZ6YGWd6NmMg6LdJG5I7vXqEOJZ3L7ibkbbLxM-lQvM7BhS3ouTiZtJDn-hRJpg9KlgZDbT6To78mRee3Fdg_rGcuDJt62lwA5UqqWA8Q=w408-h306-k-no" },
      { name: "Milan, Italy", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqxD5YyuUc_4-syHI9CI_wBcm4TLGV-CUNe40itcfQJD_Vzst7kbKye3_e-h3ir_8F_qFu-Sq-qj2IRmJ2S4d6bSmAEEvB0PliMkKB37YrSxJ5ZxP1Xr2-p92THy-eJDIN1jWwfjIQILgUP=w408-h306-k-no" },
    ],
  },
  {
    name: "Pacific Coast Highway", pack: "winter", region: "US West Coast",
    stops: [
      { name: "Seattle, WA", lat: 47.60813406108964, lng: -122.33637756859338, photo: "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQiBeX3WlcjYmOX6m85g83BtLDrMgp-lVD_FU65AX6kyRcLDaaE4yw8Kb09XhFUTIQkVUaeP705vGKCTtgjjeCIaPI&s=19" },
      { name: "Cannon Beach, OR", lat: 45.89249705320373, lng: -123.96179186332766, photo: "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQGRT6L0vzVdWecz2Q3HAt3TTA_HhUDXQcs7EJs0NNhMcsG7kNbBmXKB9bZpTACaBElB0C1K6TmkWAX_P8LJc_2zSo&s=19" },
      { name: "Redwood National and State Parks", lat: 41.42544134343592, lng: -124.04492646697321, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweq-uU76U7QBEbKkTwMWH1pzFW30q9JahjWw3KBCawbkEumbdxx_rlzJhKy42oVVBPFPPVdflkyS7ZlPphelkVd5rv1mxmt4WmJ7uMzagKa9TPwpSriDWNw3X5zxFupV0TqpE-g=s1360-w1360-h1020-rw" },
      { name: "San Francisco, CA", lat: 37.77449828816794, lng: -122.4355438080429, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerLyZUijtUozkGerTY50vIzuAoT1E0DmVwNuH_cqgxPmeqoVH8agZqkcFF0LvCxuMfqhgg-DV28NYhW6lHsq2nka-yp1oXi46QYcTvuPM80oHRGVUN0Yak6ppTeFdQe9qK-JgnGrQ=w408-h306-k-no" },
      { name: "Big Sur, CA", lat: 36.270535458388196, lng: -121.80812987161562, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweoh5naEHUevo4j-2gNsqxJNIhK0OUpQqoj8uJNEA38cwrnB9EdQbJTWNlc6eQvGLnfVcVDz4DXA1Y-vjagMYo-pzGYZxnBTnrqgzNZ4HEdZeb9cHXYRNESTQzNGuU5GuEcTSSQ-iA=w408-h306-k-no" },
      { name: "Los Angeles, CA", lat: 34.05873066528658, lng: -118.24150712116008, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepfzs42V8nhKsHdRrSX__fd1myWSa5vyazRZpBcWrn77-qxa-JNqz90QPekHjSKU_UhWScsNQie21_lb2WH1vGcXVS5N-kBRsUwOZFuZLxW1BfMcCsXLcfJXmMRvICBNVBI60Oc=w408-h349-k-no" },
    ],
    travelTimes: ['2h 45m','6h 15m','5h 15m','2h 15m','5h'],
    decoys: [
      { name: "CN Tower, Toronto", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerCLF4elgvw9Nu7LVFcZWpIqA0QwoS_mZT2P6mXKQv_3rI9C_OUrNLXdvrBCaPirNhKmfiMhu1l_dKbXwKRr0QZenBjADluZWDeCR5xkr_MZxyljCiCbpMnzDil6oH1htczgtr2=w408-h495-k-no" },
      { name: "Mount McKinley, AK", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwervsZk0gpTiDPbgeY6xw_al_7sjSNg3HNwArgH-I7ezKOaEhw61SqUc0HvVZ0oi22gYCvIBhXP2SHKpv_KpH5rspinkCMhFtViabxN3jE_JCm-ZLpMMOvMERFO-bztc-EmI8Soe=w408-h314-k-no" },
      { name: "Joshua Tree National Park", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerARlPTY6dSLrd3mdGs-AtIhzSIXKe8rCFSCooDL0oWUzKkTQrZqn3Hxbg1_p6N1nR7F6fQevCyeHsQm5OLL4zD0GKWW9f-guzJItsG-5UbtrRMc0U-_BMW81C-7q5qvwoeueo=w408-h306-k-no" },
    ],
  },
  {
    name: "East Coast Classic", pack: "winter", region: "US East Coast",
    stops: [
      { name: "Boston, MA", lat: 42.3597781673731, lng: -71.04754063960345, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweonmWi5hWxUZpOZAviCQsa1ogYN7Y4lpQ3FB0N5UgI7OdgLO4JrVtngVkGpCvYR4wvvVKGkwssNvl9cw7uF0pIDbYKM9zpeOXQNLsfQ_44u1ykUSXlg_brfXPMMDWP7Hk0PNhVC1g=w408-h307-k-no" },
      { name: "New York, NY", lat: 40.711079074535384, lng: -74.0293193784194, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweoCd3lpWsZNa2lC9MWtOxBayDspbSbyqvn1mj058DTMBf9aWMQUeHclNj1qWdgIwyVZdZtXskVzUGTYomzu4LFvAJJXrGfW0q_WJgTxoif-igrIwoOQh9dKU0uiPd6R68m-juVg=w408-h544-k-no" },
      { name: "Philadelphia, PA", lat: 39.95607909556727, lng: -75.15510791496787, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweo9sZV2XkGKiiwHAmRKSLsSFqQ0zk6MTpyKOUqEO0A23eQlp4dVGeFbsV_xr-4g4mhr6cw5Enz-R66y9ftNLDe37P96uc_fPHrwTBTRP328JqY7i1lnvPwjJEuAIeF0IpwSd4-s=w408-h541-k-no" },
      { name: "Washington DC", lat: 38.905014425558065, lng: -77.04821485996722, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqs7ELkdxxf0LGiYTr8fBZ23PvYEf4Scvz-Qsoa5NrNCIvYU0CXxaDyYC_CtCup8VguvX4w-3g0t9tLX7UQ7jNJ63_kB8OUxfsG6zvsEvk1PQ1k1DTphql3AWFijpG_Km242WE=w408-h544-k-no" },
      { name: "Charleston, SC", lat: 32.78328386933065, lng: -79.93660975617328, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqEPQiIeKwzY4fXaFEwQg-fizScNk6QY-1Pv3HJZK8wVVIU15xSxrxfYzqZZ12kjBMlyjyxGHoMDfO02RwNBERRKCBah8lzdDEpl0KhQSffwIZ1x4imh1J6bw5uPti1YtBaT-8_=w408-h271-k-no" },
      { name: "Miami, FL", lat: 25.762294690802904, lng: -80.19460671323964, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwer6ajAKD6h5TVUDVFnkcXqCYG0ZIhqIVFZXg_b0jnFJCcW09299RBPzrXwqLM3A01psfuwkx44ShZKLnV-iNMaCR8ltQ6OSpNXog0TPfmdMDQ1HKhAvaICZM1iKmDF_XarPhSs=w408-h408-k-no" },
    ],
    travelTimes: ['3h 45m','1h 30m','2h 30m','9h','1h 45m'],
    decoys: [
      { name: "Gateway Arch, St Louis, MO", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepiBtM4Qqiy5gVXQ21OM14r5zQZhx_C8iOALZWbful-4-p2AcENFR1yF0-2FmtxANi3d7teMVIIVahP-KgYMYEds8Mol-jVzvPaTmF_36cn_WwGykIPJZ_Hq4Y_I9D6tXWYmAHZ2Jo-gB9u=w408-h464-k-no" },
      { name: "Chicago, IL", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqJOF-P8psDfQRWEIQp3rV8yA0rXq5kFqSrenMijNocwhMWCQFnxVn3-5QhdtZjWIP4yrltycUjlKoobjINZmeOiQCPS3_BHWSp-_UkqgpBs-9B_vVijAMPKmeAiFEJVFf43ngZ2Q=w408-h612-k-no" },
    ],
  },  {
    name: "Round the World", pack: "winter", region: "Global",
    stops: [
      { name: "Seattle, WA", lat: 47.60813406108964, lng: -122.33637756859338, photo: "https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcQiBeX3WlcjYmOX6m85g83BtLDrMgp-lVD_FU65AX6kyRcLDaaE4yw8Kb09XhFUTIQkVUaeP705vGKCTtgjjeCIaPI&s=19" },
      { name: "New York, NY", lat: 40.711079074535384, lng: -74.0293193784194, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweoCd3lpWsZNa2lC9MWtOxBayDspbSbyqvn1mj058DTMBf9aWMQUeHclNj1qWdgIwyVZdZtXskVzUGTYomzu4LFvAJJXrGfW0q_WJgTxoif-igrIwoOQh9dKU0uiPd6R68m-juVg=w408-h544-k-no" },
      { name: "Rio de Janeiro, Brazil", lat: -22.90165820111799, lng: -43.28030062191621, photo: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?" },
      { name: "Rome, Italy", lat: 41.89639505372268, lng: 12.485412492059577, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweppOiNQIn3_14fNZOuaQnuuP3TIw1HX7qbdV0yJJhH1G0JpRxf3aBf-wVfrIpjxVMztOE8NZkcATsUh7T4NGP4_un_Gf6cA6iUPRXg5FaZHc_TV699d7HC5qoaRXhRaglbvzn-B=w600-h424-p-k-no" },
      { name: "Singapore", lat: 1.283257912238297, lng: 103.8551255218627, photo: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHwxfHxTaW5nYXBvcmV8ZW58MXwwfHx8MTc3MjM5MjM0Nnww&ixlib=rb-4.1.0&q=80&w=1080" },
      { name: "Los Angeles, CA", lat: 34.05873066528658, lng: -118.24150712116008, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwepfzs42V8nhKsHdRrSX__fd1myWSa5vyazRZpBcWrn77-qxa-JNqz90QPekHjSKU_UhWScsNQie21_lb2WH1vGcXVS5N-kBRsUwOZFuZLxW1BfMcCsXLmMRvICBNVBI60Oc=w408-h349-k-no" },
    ],
    travelTimes: ['2h 45m','6h 15m','5h 15m','2h 15m','5h'],
    decoys: [
      { name: "CN Tower, Toronto", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerCLF4elgvw9Nu7LVFcZWpIqA0QwoS_mZT2P6mXKQv_3rI9C_OUrNLXdvrBCaPirNhKmfiMhu1l_dKbXwKRr0QZenBjADluZWDeCR5xkr_MZxyljCiCbpMnzDil6oH1htczgtr2=w408-h495-k-no" },
      { name: "Mount McKinley, AK", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwervsZk0gpTiDPbgeY6xw_al_7sjSNg3HNwArgH-I7ezKOaEhw61SqUc0HvVZ0oi22gYCvIHfXP2SHKpv_KpH5rspinkCMhFtViabxN3jE_JCm-ZLpMMOvMERFO-bztc-EmI8Soe=w408-h314-k-no" },
      { name: "Joshua Tree National Park", photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAwerARlPTY6dSLrd3mdGs-AtIhzSIXKe8rCFSCooDL0oWUzKkTQrZqn3Hxbg1_p6N1nR7F6fQevCyeHsQm5OLL4zD0GKWW9f-guzJItsG-5UbtrRMc0U-_BMW81C-7q5qvwoeueo=w408-h306-k-no" },
    ],
  },
  {
    name: "Seven-ish Wonders of the World", pack: "grand", region: "Global",
    stops: [
      { name: "Chichen Itza, Mexico", lat: 20.6843, lng: -88.5678, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweodENlLTM7mXcYYe1Cz3CI5d_zZZe75vVKIExdeGIwzELdu0tWdiUTGLgWPXgta83QubFIM1cIPoWQ9thwqEEUTqkHuMmxGCzawEBF-v_wfgiJBAJb0Z4jURJC3_bEfwwgJYLcyPSznLWNw=w408-h306-k-no" },
      { name: "Machu Picchu, Peru", lat: -13.1631, lng: -72.5450, photo: "https://images.unsplash.com/photo-1526392060635-9d6019884377?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHwxfHxNYWNodSUyMFBpY2NodSUyQyUyMFBlcnV8ZW58MXwwfHx8MTc3MjM5MjMyNnww&ixlib=rb-4.1.0&q=80&w=1080" },
      { name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweonjXVuw29RpQSQaR-17gM8tHQ3utcyUUjqWO-DDbNv0XtoT2FZIpLKcafnw2H3cfBlEVXmnvg0fcbnKudeBtcW5wPRRIgpOySkv3ZSYc5PGime8dXlUfUbKkUpj1kY1C0Mlqnr=w408-h544-k-no" },
      { name: "Colosseum, Rome, Italy", lat: 41.8902, lng: 12.4922, photo: "https://lh3.googleusercontent.com/gps-cs-s/AHVAweqf3Ep-js8fkYsJn3VRlRFFw2zGmpFCLr3z50yEmaMS78drQvS5oPfdc5c-1Z_uHveaKQURrG3W425rJonr1pv6cllE_YJK8moUg-x5sC0vwGCSfciH6cvLzd4EjUHJ8SAkZnPW=w408-h306-k-no" },
      { name: "Pyramids of Giza, Egypt", lat: 29.9792, lng: 31.1342, photo: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHwxfHxDYWlyb3xlbnwxfDB8fHwxNzcyMzM1Nzk1fDA&ixlib=rb-4.1.0&q=80&w=1080" },
      { name: "Petra, Jordan", lat: 30.3285, lng: 35.4444, photo: "https://images.unsplash.com/photo-1530624852-9beb898b2820?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHw3fHxQZXRyYXxlbnwxfDB8fHwxNzcyMzQxMzc5fDA&ixlib=rb-4.1.0&q=80&w=1080" },
      { name: "Taj Mahal, Agra, India", lat: 27.1751, lng: 78.0421, photo: "https://images.unsplash.com/photo-1548013146-72479768bada?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHwyfHxBZ3JhfGVufDF8MHx8fDE3NzIzMzU3ODF8MA&ixlib=rb-4.1.0&q=80&w=1080" },
      { name: "Great Wall of China", lat: 40.4319, lng: 116.5704, photo: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHw1fHxCZWlqaW5nfGVufDF8MHx8fDE3NzIzMzU3ODl8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    ],
    travelTimes: [],
    decoys: [
      { name: "Sydney, Australia", photo: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4ODQ4OTB8MHwxfHNlYXJjaHw3fHxTeWRuZXklMjBPcGVyYSUyMEhvdXNlfGVufDF8MHx8fDE3NzIzOTIzNTF8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    ],
  },

];
