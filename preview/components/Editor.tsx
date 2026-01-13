import { useEffect, useRef, type JSX } from 'react';
import { editor } from 'monaco-editor';

import { compile } from '@/index';

import styles from './Editor.module.css';

interface Props {
  onCompile?: (code: string) => void;
}

export default function Editor(props: Props): JSX.Element {
  const domRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!domRef.current) {
      return;
    }
    const protoEditor = editor.create(domRef.current, {
      language: 'proto',
      fontFamily: `'cascadia code', monospace`,
      minimap: {
        enabled: false,
      },
      automaticLayout: true,
      placeholder: 'Type your proto code here',
    });
    let timer: number | null = null;
    protoEditor.onDidChangeModelContent(() => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      timer = window.setTimeout(() => {
        const protoCode = protoEditor.getValue();
        const output = compile(protoCode);
        if (output.errors.length === 0) {
          props.onCompile?.(output.code);
        }
      }, 300);
    });
  }, []);

  return (
    <div className={styles.editor}
      ref={domRef}>
    </div>
  );
}
