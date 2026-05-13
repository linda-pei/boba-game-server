import type { ReactElement } from "react";
import type { StartupsCompany } from "../../types";

interface Props {
  company: StartupsCompany;
  size?: number;
}

/** Tech-startup-style monochrome logos that combine each company's animal with
 *  its product. All paths use currentColor; cutouts via fill-rule="evenodd" let
 *  the card's background colour show through (so e.g. giraffe spots, hippo bolt,
 *  octopus eyes are "transparent" holes in the silhouette). */
const LOGO_PATHS: Record<StartupsCompany, ReactElement> = {
  // ─── Giraffe Beer ─────────────────────────────────────────────────────────
  // Beer mug with giraffe-spot cutouts on the body + foam dollops on top.
  giraffe: (
    <g fill="currentColor">
      {/* Foam */}
      <circle cx="36" cy="22" r="6" />
      <circle cx="50" cy="16" r="8" />
      <circle cx="64" cy="22" r="6" />
      <circle cx="44" cy="26" r="4" />
      <circle cx="56" cy="26" r="4" />
      {/* Mug body with spot cutouts */}
      <path
        fillRule="evenodd"
        d="
          M28 30 L72 30 L68 86 q-1 6 -7 6 H39 q-6 0 -7 -6 Z
          M40 44 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0
          M55 52 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M44 62 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M56 74 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0
        "
      />
      {/* Mug handle */}
      <path
        d="M72 44 q12 0 12 14 q0 14 -12 14"
        stroke="currentColor"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  ),

  // ─── Bowwow Games ─────────────────────────────────────────────────────────
  // Game controller silhouette with dog ears flopping up at the top corners,
  // plus a D-pad cross and two button cutouts.
  bowwow: (
    <g fill="currentColor">
      {/* Floppy dog ears */}
      <path d="M22 38 q-12 -8 -8 -22 q4 -8 14 -4 q4 4 4 16 z" />
      <path d="M78 38 q12 -8 8 -22 q-4 -8 -14 -4 q-4 4 -4 16 z" />
      {/* Controller body with D-pad and button cutouts */}
      <path
        fillRule="evenodd"
        d="
          M16 40 q0 -8 8 -8 h52 q8 0 8 8 v24 q0 8 -8 8 h-52 q-8 0 -8 -8 z
          M30 48 h6 v-6 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 z
          M62 46 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M70 56 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M62 64 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M54 56 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
        "
      />
    </g>
  ),

  // ─── Flamingo Soft ────────────────────────────────────────────────────────
  // Speech bubble (software/chat) with a flamingo silhouette cut out of it.
  flamingo: (
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="
        M14 24 q0 -10 10 -10 h52 q10 0 10 10 v32 q0 10 -10 10 h-26 l-14 14 v-14 h-12 q-10 0 -10 -10 z
        M56 24 q-4 0 -6 3 q-2 4 1 6 q3 2 2 4 q-2 3 -6 4 q-8 2 -10 12 q-1 8 6 12 q4 2 10 1 q5 -1 6 -4 q1 -3 -2 -4 q-4 -1 -4 -4 q1 -3 4 -5 q4 -2 6 -7 q2 -7 -2 -14 q-2 -4 -5 -4 z
        M62 22 l5 -2 l-2 4 z
      "
    />
  ),

  // ─── Octo Coffee ──────────────────────────────────────────────────────────
  // Coffee cup at the base; octopus head sits on top of it with two eye
  // cutouts; tentacle "steam lines" rise from the cup edges.
  octo: (
    <g fill="currentColor">
      {/* Tentacle curls rising from cup edges */}
      <path
        d="M20 30 q-2 -6 3 -10 q5 -3 6 2"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M80 30 q2 -6 -3 -10 q-5 -3 -6 2"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M35 24 q0 -8 6 -10 q5 -1 5 4"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M65 24 q0 -8 -6 -10 q-5 -1 -5 4"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Octopus head with eye cutouts */}
      <path
        fillRule="evenodd"
        d="
          M50 28 q-22 0 -22 18 q0 12 22 12 q22 0 22 -12 q0 -18 -22 -18 z
          M40 42 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
          M54 42 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0
        "
      />
      {/* Coffee cup */}
      <path d="M28 60 h44 v18 q0 8 -8 8 h-28 q-8 0 -8 -8 z" />
      {/* Cup handle */}
      <path
        d="M72 66 q10 0 10 8 q0 8 -10 8"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      {/* Tentacle drips coming off the cup base */}
      <path
        d="M36 86 q0 4 -4 4 q-3 0 -3 -3"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M64 86 q0 4 4 4 q3 0 3 -3"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  ),

  // ─── Hippo Powertech ──────────────────────────────────────────────────────
  // Hippo head silhouette with a lightning-bolt cutout on its forehead.
  hippo: (
    <g fill="currentColor">
      {/* Ears */}
      <ellipse cx="26" cy="34" rx="6" ry="8" />
      <ellipse cx="74" cy="34" rx="6" ry="8" />
      {/* Head + bolt cutout */}
      <path
        fillRule="evenodd"
        d="
          M50 20 c-22 0 -32 14 -32 30 c0 18 14 32 32 32 c18 0 32 -14 32 -32 c0 -16 -10 -30 -32 -30 z
          M56 32 L36 56 L48 56 L42 76 L66 50 L54 50 L60 32 Z
        "
      />
      {/* Nostrils (small dots) */}
      <circle cx="42" cy="72" r="2.5" />
      <circle cx="58" cy="72" r="2.5" />
    </g>
  ),

  // ─── Elephant Mars Travel ─────────────────────────────────────────────────
  // Elephant head inside an astronaut helmet (round dome + neck base),
  // trunk curling down at the bottom.
  emt: (
    <g fill="currentColor">
      {/* Helmet outline */}
      <circle
        cx="50"
        cy="44"
        r="36"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* Helmet neck/shoulder base */}
      <path d="M18 76 q4 -8 16 -10 h32 q12 2 16 10 v10 h-64 z" />
      {/* Elephant ears (big flaps) */}
      <ellipse
        cx="30"
        cy="46"
        rx="9"
        ry="13"
        transform="rotate(-18 30 46)"
      />
      <ellipse
        cx="70"
        cy="46"
        rx="9"
        ry="13"
        transform="rotate(18 70 46)"
      />
      {/* Elephant head + eye cutouts + trunk */}
      <path
        fillRule="evenodd"
        d="
          M50 24 q-16 0 -16 18 q0 10 6 14 q-2 8 1 14 q4 6 9 0 q2 -4 2 -8 q3 0 6 0 q0 4 2 8 q5 6 9 0 q3 -6 1 -14 q6 -4 6 -14 q0 -18 -16 -18 z
          M44 40 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0
          M51 40 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0
        "
      />
    </g>
  ),
};

export default function CompanyLogo({ company, size = 28 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {LOGO_PATHS[company]}
    </svg>
  );
}
