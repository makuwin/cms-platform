type ShareButtonsProps = {
  url: URL;
  title: string;
};

const networks = [
  { label: 'Twitter', base: 'https://twitter.com/intent/tweet?text=' },
  { label: 'LinkedIn', base: 'https://www.linkedin.com/shareArticle?mini=true&url=' },
  { label: 'Reddit', base: 'https://www.reddit.com/submit?url=' },
];

export default function ShareButtons({ url, title }: ShareButtonsProps) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {networks.map((network) => {
        const shareUrl = `${network.base}${encodeURIComponent(url.toString())}&title=${encodeURIComponent(title)}`;
        return (
          <a
            key={network.label}
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 bg-neutral-900/80 px-4 py-2 text-xs font-semibold text-neutral-200 transition hover:border-primary-500 hover:bg-primary-500/20"
          >
            Share on {network.label}
          </a>
        );
      })}
    </div>
  );
}
