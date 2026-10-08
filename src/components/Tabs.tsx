import { tabBarStyle, tabStyle } from '../styles/styles';

export default function Tabs<T extends string>({
    tabs,
    active,
    onChange
}: {
    tabs: { id: T; label: string }[];
    active: T;
    onChange: (id: T) => void;
}) {
    return (
        <div role="tablist" className="no-scrollbar" style={tabBarStyle}>
            {tabs.map((t) => (
                <button
                    key={t.id}
                    role="tab"
                    aria-selected={active === t.id}
                    onClick={() => onChange(t.id)}
                    style={tabStyle(active === t.id)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    );
}
