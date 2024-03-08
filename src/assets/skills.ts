import { SKILL, type Project, type Skill } from "../types";
import { getExperienceRelatingToSkill } from "./experience";

export type SkillInformation = {
    description: string,
    experience: Set<string>; 
    projects: Project['project_id'][]
}

export const skills: { [id: Skill]: SkillInformation } = {
    [SKILL.JAVA]: {
        experience: getExperienceRelatingToSkill(SKILL.JAVA),
        description: "My journey with Java began when I ventured into the realm of Minecraft plugins. This was a pivotal moment for me, as it marked my transition from using simplistic tools to embracing a more robust programming language. Through developing and refining my dungeon-crawler server and plugins in Minecraft, I significantly enhanced my Java skills, transforming my raw enthusiasm into technical proficiency. This experience laid the groundwork for my first major project, a Java Library designed to facilitate seamless interaction between GameMaker clients and multiplayer game servers. My commitment to mastering Java was further evidenced in my academic pursuits, where I dedicated a year to mastering the language, solidifying my understanding of its ecosystem. This skill set not only contributed to the success of my projects like the GM Server but also propelled my professional development, leading to my role as a software developer where Java continued to be a cornerstone of my work.",
        projects: ['gm-server']
    },
    [SKILL.GAMEMAKER]: {
        experience: getExperienceRelatingToSkill(SKILL.GAMEMAKER),
        description: "My foray into GameMaker began during my school years, transitioning from Scratch to GameMaker:Studio. This shift marked a significant leap in my game development journey, allowing me to explore and enhance my creative and technical abilities. My extensive use of GameMaker enabled me to publish multiple games on platforms like itch.io, notably one that achieved 50,000 plays, a testament to my growing proficiency and appeal as a game developer. Over the years, I've undertaken numerous projects in GameMaker, developing a keen understanding of its scripting language and environment. This experience not only honed my game development skills but also provided a practical framework for exploring concepts and ideas quickly. My transition from GameMaker to more advanced programming endeavors exemplifies my growth and adaptability in the field of game development.",
        projects: ['gm-server', 'pixel-fly', 'bit-quest', 'clumsy-santa'],
    },
    [SKILL.JAVASCIPRT]: {
        experience: getExperienceRelatingToSkill(SKILL.JAVASCIPRT),
        description: "JavaScript became an integral part of my skill set as I ventured into web development, transitioning from game development to broader programming horizons. My engagement with JavaScript was intensified during my current job where I was required to swiftly grasp PHP alongside JavaScript, pushing me to adapt and integrate new languages into my repertoire. This experience, coupled with my background in Java and GameMaker, provided a solid foundation for tackling various web development projects. My familiarity with JavaScript grew as I delved into projects requiring both front-end and back-end development, reinforcing my skills and enabling me to contribute effectively to my workplace. Through university assignments, personal projects and workplace accomplishments I've leveraged JavaScript to create dynamic and responsive user experiences, demonstrating my capacity to adapt and thrive in diverse development environments.",
        projects: ['devpad', 'forbit.dev'],
    },
    [SKILL.LEADERSHIP]: {
        experience: getExperienceRelatingToSkill(SKILL.LEADERSHIP),
        description: "Leadership has been an instrumental part of my growth, both personally and professionally. My role as a Crew Trainer at McDonald's, coupled with my position as a Badminton Coach, laid the foundation for my leadership skills, teaching me the importance of teamwork, mentorship, and effective communication. These experiences honed my ability to lead by example, inspire others, and foster a collaborative environment, which translated well into my programming and game development projects. In my university studies and group projects, I often found myself naturally stepping into leadership roles, guiding peers through complex programming challenges and collaborative tasks. This inclination towards leadership extended to my professional life as a software developer, where I led by initiative, contributing not only through code but also through guiding team dynamics and project direction. My leadership skills, cultivated through diverse experiences, have been essential in shaping my approach to problem-solving and team management in the tech industry.",
        projects: []
    },
}
