import { createSignal, onMount, Show } from "solid-js";
import { Typewriter } from "solidjs-typewriter";

type Props = {
	words: string[];
};

export default function HeroRole(props: Props) {
	const [reduce_motion, set_reduce_motion] = createSignal(false);

	onMount(() => {
		set_reduce_motion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	});

	return (
		<Show when={!reduce_motion()} fallback={<span>{props.words[1]}</span>}>
			<Typewriter words={props.words} cursor={false} loop={-1} />
		</Show>
	);
}
