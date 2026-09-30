// Matches plugins/dita-bootstrap Customization/xsl/nav.xsl's collapsible-toc chevron;
// collapsible-toc.css rotates it via .bd-links .btn[aria-expanded='true'] svg
export default function Chevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 14l6-6-6-6"
      />
    </svg>
  );
}
