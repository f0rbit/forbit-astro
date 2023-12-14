import { SKILL, SKILL_EVENT_TYPE, AWARD_TYPE } from "../types";
import type { Award, Skill, SkillEvent } from "../types";

export type Experience = {
    start_date: Date,
    end_date: Date | null,
    title: string,
    description: string,
    type: "learning" | "hobby" | "professional",
    position: number,
    skills: SkillEvent[],
    awards: Award[]
}

const scratch_start = new Date("2011-10-10T00:00:00.000+09:30");
const scratch_end = new Date("2016-04-01T00:00:00.000+09:30");
const gamemaker_end = new Date("2018-06-01T00:00:00.000+09:30");
const minecraft_start = new Date("2018-01-01T00:00:00.000+09:30");
const minecraft_end = new Date("2019-11-01T00:00:00.000+09:30");
const gamedev_end = new Date("2022-05-13T00:00:00.000+09:30");
const java_start = new Date("2021-06-11T00:00:00.000+09:30");
const java_end = gamedev_end;
const uni_start = new Date("2021-03-01T00:00:00.000+09:30");
const uni_end = new Date("2024-11-20T00:00:00.000+09:30");
const webdev_start = new Date("2021-06-04T00:00:00.000+09:30");
const db_engineer_start = new Date("2021-11-01T00:00:00.000+09:30");
const db_engineer_finish = new Date("2022-04-11T00:00:00.000+09:30");
const first_job_start = new Date("2022-06-08T00:00:00.000+09:30");
const maccas_start = new Date("2019-02-28T00:00:00.000+09:30");
const maccas_finish = new Date("2022-07-12T00:00:00.000+09:30");
const badminton_coach_start = new Date("2021-01-28T00:00:00.000+09:30");
const badminton_coach_finish = new Date("2022-12-05T00:00:00.000+09:30");

export const experience: { [id: string]: Experience } = {
    "scratch": {
        title: "Scratch",
        description: "My first baby steps into the programming world was with Scratch. This software was installed on every computer at my school, and one of my friends had stumbled upon it randomly, and I was instantly obsessed.",
        start_date: scratch_start,
        end_date: scratch_end,
        position: 0,
        type: "learning",
        skills: [{ skill: SKILL.SCRATCH, events: [SKILL_EVENT_TYPE.MASTER] }],
        awards: []
    },
    "game-maker": {
        title: "GameMaker",
        description: "From what I had learnt with my experimentation with Scratch, I was fascinated by the world of game-dev, like a lot of young programmers. During school, a very helpful teacher suggested that I try out GameMaker:Studio, as our school had secured a handful of licenses for GameMaker:Studio 1.4, which was pretty new at the time. I was hesitant at first during the transition, it took me a while to get out of the blocky dialect of Scratch and move to a more text-based scripting language (GameMaker Language). After about a month I finally switched over, and had fallen in love with the enhanced capabilities, performance, and workflow of GameMaker. I spent these years creating little games for my friends and myself, finding that programming was incredibly enjoyable, and even published some of these games online.",
        start_date: scratch_end,
        end_date: gamemaker_end,
        position: 1,
        type: "learning",
        skills: [{ skill: SKILL.GAMEMAKER, events: [SKILL_EVENT_TYPE.BEGIN, SKILL_EVENT_TYPE.LEARN] }],
        awards: []
    },
    "minecraft-dev": {
        title: "Minecraft Plugins",
        description: "Throughout my childhood, there was one game I always came back too. I started playing minecraft early in 2012, and I had tinkered around with minecraft servers, as I hosted some in order to play with my friends. During this time I found plugins, and I felt like such a hacker editing the configuration files. It wasn't long until my love for game-dev crossed paths with Minecraft, and I embarked on a journey to create a dungeon-crawler within Minecraft, using plugins. At first, I was using all pre-made plugins and attempting to configure them to throw together some experience to share with others. Eventually, I found needs that couldn't be met with any existing plugins, so I attempted to create my own. This was my first steps into the world of Java - my first \"real\" programming language.",
        start_date: minecraft_start,
        end_date: minecraft_end,
        position: 2,
        type: "learning",
        skills: [{ skill: SKILL.DEPLOYMENT, events: [SKILL_EVENT_TYPE.BEGIN] }, { skill: SKILL.JAVA, events: [SKILL_EVENT_TYPE.BEGIN] }],
        awards: []

    },
    "game-dev": {
        title: "Game Development",
        description: "After having published a couple of my simple games with GameMaker on itch.io, and one of them amassing 50,000 plays, I decided to take programming a bit more seriously. I had purchased GameMaker Studio 2 with the money I had earnt from working at my local McDonald's, and I set out to create any game that I could think of. Of course, like all motivation-fueled game-devs, I had a sserious case of shiny object syndrome. This meant that throughout my entire time making games, I had only managed to publish onto itch.io about 5 of them. I had upwards of 30 projects that lay unfinished, however my programming skills increased with each game, reinforcing and learning new programming patterns so that each game was slightly better & cleaner than the last.",
        start_date: gamemaker_end,
        end_date: gamedev_end,
        position: 3,
        type: "hobby",
        skills: [{ skill: SKILL.GAMEMAKER, events: [SKILL_EVENT_TYPE.MASTER] }, { skill: SKILL.JAVA, events: [SKILL_EVENT_TYPE.LEARN] }],
        awards: [{ type: AWARD_TYPE.CERTIFICATE, title: "Introduction to Game Development", description: "Completion of a 3-day bootcamp at Flinders University" }, { type: AWARD_TYPE.EDUCATION, title: "Cert III in Programming", description: "Certificate III in C++ Programming, by the Adelaide Institute of Entertainment" }],
    },
    "intense-java": {
        title: "Mastering Java",
        description: "After rewriting my Minecraft dungeon-crawler server & plugins twice, I had grown quite comfortable with the Java eco-system, and I set out to make my first large-scale project (library). While fooling around with Game Development, I grew a keen interest in multiplayer games, and since all my games were developed with GameMaker, I wanted an easy way to be able to manage larger-scale multiplayer games. GameMaker had support for some pretty raw networking functions, a basic socket implementation and a basic http implementation. GameMaker also had no way of running a server that was written in GML as a headless process, which is what I wanted to create. So I decided to create a project that would suit my needs. The project was to write a Java Library that would be able to easily interact with GameMaker clients, and operate as a game server for multiplayer games. This project grew my skillset very quickly, and I got my first taste of deploying a coding project & the open-source workflow",
        start_date: java_start,
        end_date: java_end,
        position: 4,
        type: "hobby",
        skills: [{ skill: SKILL.JAVA, events: [SKILL_EVENT_TYPE.MASTER] }, { skill: SKILL.DEPLOYMENT, events: [SKILL_EVENT_TYPE.LEARN] }],
        awards: []
    },
    "mcdonalds": {
        title: "McDonald's",
        description: "During school and for my first couple years in University, I worked at McDonald's. I enjoyed the high-pace environment, and the community at McDonald's, I managed to build life-long friendships with my co-workers. I attained the role of Crew Trainer, and did some professional development with the McDonald's office to improve my coaching ability, which went hand-in-hand with my other job after school, Badminton Coach.",
        start_date: maccas_start,
        end_date: maccas_finish,
        position: 5,
        type: "professional",
        skills: [{ skill: SKILL.LEADERSHIP, events: [SKILL_EVENT_TYPE.BEGIN] }],
        awards: [{ type: AWARD_TYPE.AWARD, title: "Grill Master", description: "Awarded to the top performing staff member in kitchen over 3 months" }]
    },
    "university": {
        title: "University",
        description: "I started studying Computer Science in 2021. I've always known - well at least since I was 10 - that I wanted to be a programmer. My family was always very supportive of my aspirations (my father especially, as he had already been working in this field for most of his life). University has helped me to formalise my knowledge, and gain a deeper understanding of the lower-level and foundations of programming. Before University, I only really felt confident in a couple languages, the ones that I had spent years working with; but now I believe I could pick up any new language within a day - and be able to write professional-level code within a week",
        start_date: uni_start,
        end_date: uni_end,
        position: 6,
        type: "learning",
        skills: [],
        awards: [{ type: AWARD_TYPE.EDUCATION, title: "Bachelor of Computer Science", description: "Will achieve in 2024, from the University of Adelaide" }],
    },
    "badminton-coach": {
        title: "Badminton Coach",
        description: "While at school, I excelled at Badminton, and was offered to coach the school team after I had finished. This job was great fun, and I really developed as a leader during this time. I was in charge of 8 different teams of wonderful badminton players, and we played at the top level for our local city. Coaching Badminton was such a fun job, and was a nice change of pace compared to the high-stress environment McDonald's.",
        start_date: badminton_coach_start,
        end_date: badminton_coach_finish,
        position: 7,
        type: "professional",
        skills: [{ skill: SKILL.LEADERSHIP, events: [SKILL_EVENT_TYPE.LEARN] }],
        awards: []
    },
    "web-development": {
        title: "Web Development",
        description: "At the beginning of University, I found the programming courses relatively easy, so I decided to start thinking about how I could earn some money off programming, as that was my end goal - to be able to support myself by doing what I love. I did some market research (watching developer influencers on youtube), and decided that front-end programming was pretty important in the workface, and that was a sector of programming that I had never endulged in. I felt confident enough in my backend skills - due to my experience with Java and the development of my gm-server library, that I decided the best course of action would be for me to just dip my toes in web-dev, enough so that I could safely say \"I can do this\" if asked to write a website while working. Needless to say, I fell in love with the Web Development world, and it's become my favourite area of programming",
        start_date: webdev_start,
        end_date: null,
        position: 8,
        type: "hobby",
        skills: [{ skill: SKILL.HTML, events: [SKILL_EVENT_TYPE.BEGIN, SKILL_EVENT_TYPE.LEARN] }, { skill: SKILL.CSS, events: [SKILL_EVENT_TYPE.BEGIN, SKILL_EVENT_TYPE.LEARN] }],
        awards: []
    },
    "database-engineer": {
        title: "Database Engineer",
        description: "After my first year of Uni, I applied for many summer contract jobs, and managed to secure a gig for a magazine company. I was tasked with preparing their existing subscribers database - which was just a couple documents in an excel file, that they emailed around to each other, for upgrading into an SQL database. I had learnt about SQL databases in school, and had done some basic experimenting around within my web development learning, so I felt confident that I could do this. I was also handed the responsiblity of filling in missing data, obtaining it from multiple internal sources (phonebooks & other excel spreadsheets) and combining them all into one database.",
        start_date: db_engineer_start,
        end_date: db_engineer_finish,
        position: 9,
        type: "professional",
        skills: [{ skill: SKILL.SQL, events: [SKILL_EVENT_TYPE.BEGIN] }],
        awards: [],
    },
    "software-developer": {
        title: "Software Developer",
        description: "After my third semester of Uni, and coming out of my first successful tech job, I applied to many junior positions in my city. I had learnt enough JavaScript & Java that I thought I could land a part-time job over the semester break, and gain some work experience as well. Eventually, I managed to get a job for a local company, which has pretty large operations but a relatively small software team. This job required me to learn PHP - a language that I had never looked at, within 2 weeks. My skills & knowledge were put to the test, but I managed to pick it up in the 2 weeks from the interview and when I started working, and within my first week I had already pushed some code to the production servers. It was quite interesting moving from web-dev with React & NextJS to just using vanilla PHP and JavaScript, no frameworks. This meant we basically had our own hand-rolled solutions for everything.",
        start_date: first_job_start,
        end_date: null,
        position: 10,
        type: "professional",
        skills: [{ skill: SKILL.PHP, events: [SKILL_EVENT_TYPE.LEARN, SKILL_EVENT_TYPE.BEGIN] }, { skill: SKILL.HTML, events: [SKILL_EVENT_TYPE.MASTER] }, { skill: SKILL.CSS, events: [SKILL_EVENT_TYPE.MASTER] }, { skill: SKILL.SQL, events: [SKILL_EVENT_TYPE.LEARN] }, { skill: SKILL.DEPLOYMENT, events: [SKILL_EVENT_TYPE.MASTER] }, { skill: SKILL.JAVASCIPRT, events: [SKILL_EVENT_TYPE.MASTER] }],
        awards: [],
    }
};

export function getExperienceRelatingToSkill(skill: Skill) {
    const relevant = new Set<string>();
    Object.entries(experience).forEach(([id, data]) => {
        if (data.skills.find((s) => s.skill == skill)) relevant.add(id);
    });
    return relevant;
}
