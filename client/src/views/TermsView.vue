<template>
  <div class="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-4xl">
      <div class="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-8">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
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
    eyebrow: "Legal",
    title: "Terms of Service",
    intro:
      "These terms are intended for a small, free-to-play game project. They set basic rules for access and acceptable use of Elementary Dice.",
    backLabel: "Back to Landing",
    sections: [
      {
        heading: "1. Access to the game",
        paragraphs: [
          "Elementary Dice is offered as an online game for personal, non-commercial use. Access may change, pause, or stop at any time while the project is being developed or maintained.",
          "You are responsible for your own device, browser, internet connection, and account security.",
        ],
      },
      {
        heading: "2. Accounts",
        paragraphs: [
          "You may be asked to create an account or sign in with a supported provider. You agree to provide accurate information and to keep your login credentials private.",
          "You are responsible for activity that happens through your account unless the issue was caused by a security failure on the game side.",
        ],
      },
      {
        heading: "3. Acceptable use",
        paragraphs: [
          "Do not abuse the service, interfere with gameplay, attempt unauthorized access, use bots or automation to disrupt the experience, or try to damage the site or backend.",
          "Do not use the game for unlawful activity or to infringe the rights of others.",
        ],
      },
      {
        heading: "4. Game status and changes",
        paragraphs: [
          "Game content, balance, progression, features, and account systems may change without notice. Since the game is a hobby-style project, uptime and long-term availability are not guaranteed.",
          "I may fix bugs, reset data, remove features, or close access if needed to maintain or improve the project.",
        ],
      },
      {
        heading: "5. Ownership",
        paragraphs: [
          "The game, its code, branding, writing, and visual presentation remain the property of the project owner unless stated otherwise.",
          "These terms do not transfer ownership of the game or grant permission to reuse project assets beyond normal personal play.",
        ],
      },
      {
        heading: "6. No warranties and limitation of liability",
        paragraphs: [
          "The game is provided on an 'as is' and 'as available' basis, without warranties of any kind. Bugs, outages, data loss, or incomplete features may occur.",
          "To the maximum extent allowed by law, I am not liable for indirect, incidental, or consequential losses resulting from use of the game.",
        ],
      },
      {
        heading: "7. Contact and updates",
        paragraphs: [
          "These terms may be updated as the project evolves. Continued use of the game after changes means you accept the updated terms.",
          "If you need a contact method, add one to this page later before public release.",
        ],
      },
    ],
  },
  ru: {
    eyebrow: "Юридическая информация",
    title: "Условия использования",
    intro:
      "Это базовые условия для небольшого бесплатного игрового проекта. Они устанавливают общие правила доступа и использования Elementary Dice.",
    backLabel: "На главную",
    sections: [
      {
        heading: "1. Доступ к игре",
        paragraphs: [
          "Elementary Dice предоставляется как онлайн-игра для личного некоммерческого использования. Доступ может изменяться, приостанавливаться или прекращаться в любое время в процессе разработки и поддержки проекта.",
          "Вы несете ответственность за свое устройство, браузер, интернет-соединение и безопасность аккаунта.",
        ],
      },
      {
        heading: "2. Аккаунты",
        paragraphs: [
          "Для доступа к игре может потребоваться создание аккаунта или вход через поддерживаемый провайдер. Вы соглашаетесь предоставлять корректные данные и хранить учетные данные в тайне.",
          "Вы несете ответственность за действия, совершаемые через ваш аккаунт, если проблема не была вызвана сбоем безопасности на стороне игры.",
        ],
      },
      {
        heading: "3. Допустимое использование",
        paragraphs: [
          "Запрещено злоупотреблять сервисом, вмешиваться в игровой процесс, пытаться получить несанкционированный доступ, использовать ботов или автоматизацию для нарушения работы игры, а также причинять вред сайту или серверу.",
          "Запрещено использовать игру для незаконной деятельности или нарушения прав третьих лиц.",
        ],
      },
      {
        heading: "4. Состояние игры и изменения",
        paragraphs: [
          "Игровой контент, баланс, прогресс, функции и системы аккаунтов могут меняться без предварительного уведомления. Поскольку это небольшой проект, бесперебойная и долгосрочная доступность не гарантируется.",
          "При необходимости я могу исправлять ошибки, сбрасывать данные, удалять функции или закрывать доступ для поддержки и развития проекта.",
        ],
      },
      {
        heading: "5. Права на проект",
        paragraphs: [
          "Игра, ее код, название, тексты и визуальное оформление остаются собственностью владельца проекта, если отдельно не указано иное.",
          "Эти условия не передают вам права собственности на игру и не дают разрешения на повторное использование материалов проекта за пределами обычного личного использования.",
        ],
      },
      {
        heading: "6. Отказ от гарантий и ограничение ответственности",
        paragraphs: [
          "Игра предоставляется по принципу 'как есть' и 'по мере доступности' без каких-либо гарантий. Возможны ошибки, перебои, потеря данных и незавершенные функции.",
          "В максимальной степени, допустимой законом, я не несу ответственности за косвенные, случайные или последующие убытки, связанные с использованием игры.",
        ],
      },
      {
        heading: "7. Обновления и связь",
        paragraphs: [
          "Эти условия могут обновляться по мере развития проекта. Продолжение использования игры после изменений означает согласие с обновленной версией условий.",
          "Если вам нужен способ связи, добавьте его на эту страницу позже перед публичным запуском.",
        ],
      },
    ],
  },
};

const content = computed(() => contentByLocale[locale.value]);
</script>
