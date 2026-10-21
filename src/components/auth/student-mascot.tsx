import type { CSSProperties } from "react";
import styles from "./auth-experience.module.css";

export function StudentMascot({ covered, looking, progress }: { covered: boolean; looking: boolean; progress: number }) {
  return (
    <div className={styles.scene} data-covered={covered} data-looking={looking} style={{ "--look": `${Math.min(progress, 24) / 4}px` } as CSSProperties}>
      <span className={styles.orbit} />
      <span className={styles.sparkOne}>✦</span><span className={styles.sparkTwo}>✧</span>
      <div className={styles.speech}>{covered ? "Mình không nhìn đâu!" : looking ? "Email của bạn là gì nhỉ?" : "Chào bạn, cùng bắt đầu nhé!"}</div>
      <svg className={styles.student} viewBox="0 0 400 400" role="img" aria-label={covered ? "Học sinh đang lấy hai tay che mắt" : "Học sinh đang mỉm cười nhìn bạn"}>
        <ellipse cx="200" cy="375" rx="133" ry="13" fill="#163e38" opacity=".1" />
        <path d="M102 357V284Q102 239 151 234H249Q298 239 298 284V357" fill="#e9b84c" />
        <path d="M119 365V289Q119 245 171 238H229Q281 245 281 289V365" fill="#fffdf6" />
        <path d="M150 246L164 365M250 246L236 365" stroke="#215c50" strokeWidth="18" />
        <path d="M180 218V246Q200 267 220 246V218" fill="#e7a77e" />
        <path d="M171 239L200 258L183 280L160 247M229 239L200 258L217 280L240 247" fill="#e3eee8" />
        <path d="M200 258L189 278L196 321H204L211 278Z" fill="#e9b84c" />
        <g className={styles.head}>
          <ellipse cx="200" cy="145" rx="79" ry="89" fill="#233d37" />
          <circle cx="126" cy="168" r="16" fill="#efb58e" /><circle cx="274" cy="168" r="16" fill="#efb58e" />
          <path d="M132 133Q132 83 200 83Q268 83 268 133V180Q267 239 200 240Q133 239 132 180Z" fill="#f6c7a3" />
          <path d="M125 147Q111 80 165 65Q226 39 271 100L275 149L253 130L248 105Q212 140 163 116L139 151Z" fill="#233d37" />
          <path d="M148 155Q158 150 169 154M231 154Q242 150 251 155" fill="none" stroke="#233d37" strokeWidth="4" strokeLinecap="round" />
          <g className={styles.eyes} fill="#233d37"><ellipse cx="161" cy="173" rx="6" ry="8" /><ellipse cx="239" cy="173" rx="6" ry="8" /><circle cx="163" cy="170" r="2" fill="white" /><circle cx="241" cy="170" r="2" fill="white" /></g>
          <ellipse cx="150" cy="194" rx="13" ry="7" fill="#ee9d87" opacity=".65" /><ellipse cx="250" cy="194" rx="13" ry="7" fill="#ee9d87" opacity=".65" />
          <path d="M197 177L193 190H202" fill="none" stroke="#d99472" strokeWidth="3" strokeLinecap="round" />
          <path d="M185 207Q200 221 216 206" fill="none" stroke="#8a4b3e" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className={styles.leftArm}><path d="M133 294Q102 308 114 335L155 308" fill="none" stroke="#f6c7a3" strokeWidth="29" strokeLinecap="round" /><rect x="139" y="272" width="38" height="53" rx="18" fill="#f6c7a3" transform="rotate(-18 158 298)" /><path d="M150 282L156 303M160 279L166 300" stroke="#e5a57f" strokeWidth="2" strokeLinecap="round" /></g>
        <g className={styles.rightArm}><path d="M267 294Q298 308 286 335L245 308" fill="none" stroke="#f6c7a3" strokeWidth="29" strokeLinecap="round" /><rect x="223" y="272" width="38" height="53" rx="18" fill="#f6c7a3" transform="rotate(18 242 298)" /><path d="M250 282L244 303M240 279L234 300" stroke="#e5a57f" strokeWidth="2" strokeLinecap="round" /></g>
        <path d="M145 348L200 355L255 348V371L200 379L145 371Z" fill="#215c50" /><path d="M151 350L200 357L249 350" stroke="#fffdf6" strokeWidth="3" fill="none" />
      </svg>
      <span className={styles.sceneLabel}>BẠN ĐỒNG HÀNH CỦA BẠN</span>
    </div>
  );
}
