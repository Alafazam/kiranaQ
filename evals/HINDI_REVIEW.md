# Hindi and Hinglish sentences for review

Tell me corrections by id. Hindi = Devanagari, Hinglish = Roman script.

## Voice parse eval (E2, evals/voice/phrases.json)

| id | lang | owner says | expected |
|---|---|---|---|
| v01 | hi | मैगी 8 है | maggi_70g=8 |
| v02 | hi | चीनी दो कम | sugar_1kg=8 |
| v03 | hi | टाटा नमक पांच और सर्फ एक्सेल तीन है | tata_salt_1kg=5, surf_excel_1kg=3 |
| v04 | hi | एक केस पारले जी | parle_g_80g=24 |
| v05 | hi | आटा चार पैकेट हैं | aashirvaad_atta_5kg=4 |
| v06 | hi | लक्स दस और लाइफबॉय पंद्रह | lux_soap_100g=10, lifebuoy_soap_100g=15 |
| v07 | hi | थोड़ा कम करो | re-ask |
| v08 | hi | बिंटू बिस्कुट बारह हैं | re-ask |
| v09 | hinglish | chini do kam | sugar_1kg=8 |
| v10 | hinglish | Kurkure 6 aur Lays 4 hai | kurkure_masala_munch=6, lays_classic_52g=4 |
| v11 | hinglish | ek case Vim bar | vim_bar_200g=36 |
| v12 | hinglish | Maggi aur Parle-G paanch hai | re-ask |
| v13 | hinglish | Fortune oil teen kam karo | fortune_oil_1l=6 |
| v14 | hinglish | Colgate 12 hai, Dettol 3 bottle | colgate_strong_200g=12, dettol_liquid_250ml=3 |

## Assistant eval (E6, evals/assist/cases.json)

| id | style | owner says | expected action |
|---|---|---|---|
| U1-1 | hi | स्टॉक गिनना है | start_log |
| U1-2 | hinglish | naya log shuru karo | start_log |
| U2-1 | hinglish | sample photo | use_sample+count_photo |
| ↳ context | assistant said | Nayi photo lenge ya photo chunenge? | |
| U2-2 | hi | पहली फोटो | use_sample+count_photo |
| ↳ context | assistant said | Nayi photo lenge ya photo chunenge? | |
| U3-1 | hinglish | bina photo ke, khud ginunga | count_manual |
| ↳ context | assistant said | Nayi photo lenge ya photo chunenge? | |
| U3-2 | hi | फोटो नहीं, हाथ से गिनूंगा | count_manual |
| ↳ context | assistant said | Nayi photo lenge ya photo chunenge? | |
| U4-1 | hinglish | Maggi 8, Surf 5 | set_counts |
| U4-2 | hinglish | Parle G do kam | set_counts |
| U4-3 | hi | मैगी आठ है | set_counts |
| U5-1 | hinglish | save karo | save_log |
| U5-2 | hi | हो गया | save_log |
| U6-1 | hinglish | haan Sharma ne maal diya | visit |
| ↳ context | assistant said | Sharma Traders ne aaj maal diya? | |
| U6-2 | hi | नहीं, आज नहीं आया | visit |
| ↳ context | assistant said | Sharma Traders ne aaj maal diya? | |
| U7-1 | hinglish | kya mangana hai | navigate |
| U7-2 | hi | ऑर्डर दिखाओ | navigate |
| U8-1 | hinglish | Sharma ka order pakka karo | confirm_order |
| U8-2 | hi | गुप्ता का ऑर्डर पक्का करो | confirm_order |
| U9-1 | hinglish | Maggi do box kar do | set_qty |
| U10-1 | hinglish | Sharma ka order suna do | read_out |
| U10-2 | hi | गुप्ता का ऑर्डर पढ़कर सुनाओ | read_out |
| U11-1 | hinglish | Gupta kab aayega | navigate |
| U11-2 | hi | डिस्ट्रीब्यूटर कब आएंगे | navigate |
| U12-1 | hinglish | Surf kab khatm hoga | none (ask or answer) |
| U12-2 | hi | सर्फ कब खत्म होगा | none (ask or answer) |
| U13-1 | hinglish | English mein bolo | set_language |
| U13-2 | hi | हिंदी | set_language |
| U14-1 | hinglish | woh wala do | none (ask or answer) |
| U14-2 | hi | पांच | none (ask or answer) |
| U14-4 | hinglish | Maggi aur Parle-G paanch hai | none (ask or answer) |
| U1-4 | hi | स्टॉक गिनना है, नमूना फ़ोटो से | start_log+use_sample+count_photo |
