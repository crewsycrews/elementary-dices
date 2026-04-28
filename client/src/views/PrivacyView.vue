<template>
  <div class="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-sky-300/80">
              {{ content.eyebrow }}
            </p>
            <h1 class="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-white">
              {{ content.title }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              {{ content.intro }}
            </p>
          </div>

          <RouterLink
            to="/"
            class="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
          >
            {{ content.backLabel }}
          </RouterLink>
        </div>

        <div class="mt-8 space-y-6">
          <section
            v-for="section in content.sections"
            :key="section.heading"
            class="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <h2 class="text-lg font-bold text-white">
              {{ section.heading }}
            </h2>
            <div class="mt-3 space-y-3 text-sm leading-7 text-slate-300">
              <p v-for="paragraph in section.paragraphs" :key="paragraph">
                {{ paragraph }}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/i18n";

const { locale } = useI18n();

type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  backLabel: string;
  sections: LegalSection[];
};

const contentByLocale: Record<"en" | "ru", LegalContent> = {
  en: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    intro:
      "This privacy policy covers the current state of Elementary Dice as a small game project. Right now, the game stores account email addresses but does not use them for newsletters or marketing messages.",
    backLabel: "Back to Landing",
    sections: [
      {
        heading: "1. Information collected",
        paragraphs: [
          "The game currently stores the email address you provide when you register an account. It may also store other account and gameplay data needed for login, progression, and normal operation of the game.",
          "If you sign in with a third-party provider such as Google, account data needed to complete authentication may also be processed.",
        ],
      },
      {
        heading: "2. How information is used",
        paragraphs: [
          "Your email address is currently used only for account-related purposes such as identification, authentication, and internal account management.",
          "At this time, emails are not used to send marketing, newsletters, or promotional messages.",
        ],
      },
      {
        heading: "3. Sharing and disclosure",
        paragraphs: [
          "I do not sell your personal information. Information may be shared only when required to run the game, support authentication providers, comply with law, or protect the service from abuse.",
        ],
      },
      {
        heading: "4. Storage and security",
        paragraphs: [
          "Reasonable steps are taken to protect stored account data, but no online system can guarantee absolute security.",
          "Because this is a small project, security practices may evolve over time as the game grows.",
        ],
      },
      {
        heading: "5. Data retention",
        paragraphs: [
          "Account information may be kept for as long as your account remains active or as needed to operate, secure, and improve the game.",
          "Gameplay or account data may also remain in backups or logs for a limited period where necessary.",
        ],
      },
      {
        heading: "6. Your choices",
        paragraphs: [
          "If you want your account or stored email reviewed or removed, add a support contact method before public release so players have a way to request that.",
          "Until a formal support workflow exists, avoid promising deletion timelines you cannot operationally meet.",
        ],
      },
      {
        heading: "7. Changes to this policy",
        paragraphs: [
          "This policy may be updated if the game adds new account features, communication features, analytics, or payment-related systems.",
          "Continued use of the game after changes means you accept the updated policy.",
        ],
      },
    ],
  },
  ru: {
    eyebrow: "Конфиденциальность",
    title: "Политика конфиденциальности",
    intro:
      "Эта политика описывает текущее состояние Elementary Dice как небольшого игрового проекта. Сейчас игра хранит email-адреса аккаунтов, но не использует их для рассылок или маркетинговых сообщений.",
    backLabel: "На главную",
    sections: [
      {
        heading: "1. Какие данные собираются",
        paragraphs: [
          "Сейчас игра хранит email-адрес, который вы указываете при регистрации аккаунта. Также могут храниться другие данные аккаунта и прогресса, необходимые для входа, сохранения состояния и обычной работы игры.",
          "Если вы входите через стороннего провайдера, например Google, могут также обрабатываться данные, необходимые для завершения аутентификации.",
        ],
      },
      {
        heading: "2. Как используются данные",
        paragraphs: [
          "Ваш email сейчас используется только для задач, связанных с аккаунтом: идентификации, аутентификации и внутреннего управления аккаунтом.",
          "На текущий момент email не используется для маркетинга, новостных рассылок или рекламных сообщений.",
        ],
      },
      {
        heading: "3. Передача данных",
        paragraphs: [
          "Я не продаю ваши персональные данные. Информация может передаваться только в случаях, необходимых для работы игры, поддержки провайдеров аутентификации, соблюдения закона или защиты сервиса от злоупотреблений.",
        ],
      },
      {
        heading: "4. Хранение и безопасность",
        paragraphs: [
          "Принимаются разумные меры для защиты сохраненных данных аккаунта, однако ни одна онлайн-система не может гарантировать абсолютную безопасность.",
          "Поскольку это небольшой проект, меры безопасности могут меняться и улучшаться по мере его развития.",
        ],
      },
      {
        heading: "5. Срок хранения",
        paragraphs: [
          "Данные аккаунта могут храниться, пока аккаунт активен, или столько, сколько требуется для работы, защиты и улучшения игры.",
          "Игровые и учетные данные также могут временно сохраняться в резервных копиях или логах, если это необходимо.",
        ],
      },
      {
        heading: "6. Ваши возможности",
        paragraphs: [
          "Если вы хотите запросить проверку или удаление аккаунта либо email, перед публичным запуском стоит добавить рабочий способ связи для таких запросов.",
          "Пока формальный процесс поддержки не создан, не стоит обещать сроки удаления данных, которые вы пока не сможете обеспечить.",
        ],
      },
      {
        heading: "7. Изменения политики",
        paragraphs: [
          "Эта политика может обновляться, если в игре появятся новые функции аккаунтов, коммуникаций, аналитики или платежей.",
          "Продолжение использования игры после изменений означает согласие с обновленной политикой.",
        ],
      },
    ],
  },
};

const content = computed(() => contentByLocale[locale.value]);
</script>
