import type { CSSProperties } from "react";
import styles from "./auth-experience.module.css";

export function StudentMascot({ covered, looking, progress }: { covered: boolean; looking: boolean; progress: number }) {
  return (
    <div className={styles.scene} data-covered={covered} data-looking={looking} style={{ "--look": `${Math.min(progress, 24) / 4}px` } as CSSProperties}>
      <span className={styles.orbit} aria-hidden />
      <span className={styles.sparkOne} aria-hidden>✦</span><span className={styles.sparkTwo} aria-hidden>✧</span>
      <div className={styles.speech}>{covered ? "Mình không nhìn đâu!" : looking ? "Chào bạn!" : "Cùng bắt đầu nhé!"}</div>
      <svg className={styles.student} viewBox="0 0 400 400" role="img" aria-label={covered ? "Phi hành gia đang che mắt" : "Phi hành gia Trovio đang chào bạn"}>
        <ellipse cx="200" cy="378" rx="115" ry="11" fill="#603353" opacity=".13" />
        <path d="M149 283L131 348L162 355L190 297M251 283L269 348L238 355L210 297" fill="#faf7fb" stroke="#805370" strokeWidth="5" strokeLinejoin="round" />
        <path d="M125 344L166 350L164 368L121 366Q113 360 125 344ZM234 350L275 344Q287 360 279 366L236 368Z" fill="#71325a" />
        <path d="M143 234Q151 220 177 216H223Q249 220 257 234L281 320Q247 339 200 340Q153 339 119 320Z" fill="#fbf9fd" stroke="#805370" strokeWidth="5" strokeLinejoin="round" />
        <path d="M159 223Q200 244 241 223L248 268Q200 281 152 268Z" fill="#f2d1df" />
        <path d="M142 304Q200 324 258 304" fill="none" stroke="#d39cb8" strokeWidth="5" strokeLinecap="round" />
        <rect x="175" y="255" width="50" height="38" rx="9" fill="#e7edf0" stroke="#846783" strokeWidth="3" />
        <circle cx="191" cy="270" r="5" fill="#4daab1" /><circle cx="209" cy="270" r="5" fill="#cf6b99" />
        <path d="M186 283H214" stroke="#846783" strokeWidth="3" strokeLinecap="round" />
        <g className={styles.leftArm}>
          <path d="M144 241Q109 246 102 278L87 305" fill="none" stroke="#805370" strokeWidth="40" strokeLinecap="round" />
          <path d="M144 241Q109 246 102 278L87 305" fill="none" stroke="#fbf9fd" strokeWidth="33" strokeLinecap="round" />
          <circle cx="87" cy="307" r="19" fill="#e89b74" stroke="#805370" strokeWidth="4" />
        </g>
        <g className={styles.rightArm}>
          <path d="M256 241Q291 246 298 278L313 305" fill="none" stroke="#805370" strokeWidth="40" strokeLinecap="round" />
          <path d="M256 241Q291 246 298 278L313 305" fill="none" stroke="#fbf9fd" strokeWidth="33" strokeLinecap="round" />
          <circle cx="313" cy="307" r="19" fill="#e89b74" stroke="#805370" strokeWidth="4" />
        </g>
        <g className={styles.head}>
          <circle cx="200" cy="148" r="94" fill="#fbf8fc" stroke="#805370" strokeWidth="7" />
          <circle cx="200" cy="150" r="75" fill="#83cfd0" stroke="#805370" strokeWidth="6" />
          <circle cx="200" cy="151" r="66" fill="#173b55" />
          <path d="M147 118Q183 77 238 103" fill="none" stroke="#a8e3df" strokeWidth="10" strokeLinecap="round" opacity=".85" />
          <path d="M157 205Q200 226 243 205" fill="none" stroke="#63b8bd" strokeWidth="5" opacity=".7" />
          <g className={styles.eyes} fill="#e7f8f4">
            <ellipse cx="176" cy="156" rx="7" ry="10" /><ellipse cx="224" cy="156" rx="7" ry="10" />
            <circle cx="179" cy="152" r="2" fill="white" /><circle cx="227" cy="152" r="2" fill="white" />
          </g>
          <path d="M188 183Q200 192 212 183" fill="none" stroke="#e7f8f4" strokeWidth="4" strokeLinecap="round" />
          <circle cx="110" cy="155" r="13" fill="#cf7da8" stroke="#805370" strokeWidth="4" />
          <circle cx="290" cy="155" r="13" fill="#cf7da8" stroke="#805370" strokeWidth="4" />
        </g>
      </svg>
    </div>
  );
}
