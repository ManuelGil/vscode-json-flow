export const colors = [
	'blue',
	'green',
	'orange',
	'red',
	'rose',
	'slate',
	'stone',
	'violet',
	'yellow',
	'zinc',
	'gray',
	'neutral',
] as const;

export type Color = (typeof colors)[number];

export const colorClasses: Record<Color, string> = {
	blue: 'bg-blue-500',
	green: 'bg-green-500',
	orange: 'bg-orange-500',
	red: 'bg-red-500',
	rose: 'bg-rose-500',
	slate: 'bg-slate-500',
	stone: 'bg-stone-500',
	violet: 'bg-violet-500',
	yellow: 'bg-yellow-500',
	zinc: 'bg-zinc-500',
	gray: 'bg-gray-500',
	neutral: 'bg-neutral-500',
};
