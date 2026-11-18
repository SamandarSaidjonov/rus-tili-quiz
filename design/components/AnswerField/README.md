# AnswerField

Жавоб ёзиладиган майдон ва текширишдан олдинги огоҳлантириш.

**Белгилаш:** `rt-field` → `<label class="rt-label">` → `<input class="rt-input" lang="ru">` → керак бўлса `<p class="rt-warn" role="alert">` (`alert` иконкаси билан). Огоҳлантиришда `aria-invalid="true"` ва `aria-describedby`.

**Майдон атрибутлари:** `autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="done"`, сўз жавобида `autocapitalize="none"`, гап жавобида `autocapitalize="sentences"`.

**Қоидалар**
- Шрифт `ru-input` (19px): 16px дан катта, iOS экранни катталаштирмайди.
- **Огоҳлантириш хато эмас:** жавоб ҳисобга олинмайди, савол ўзгармайди. Икки ҳолат: жавоб бўш; лотин ҳарфлари бор.
- Огоҳлантириш `warn` ранги ва иконкаси билан; `bad` ранги бу ерда ишлатилмайди.
- Enter — «Текшириш», жавобдан кейин яна Enter — «Кейинги →».
