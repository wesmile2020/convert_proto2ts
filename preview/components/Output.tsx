import { useEffect, useRef, type JSX } from 'react';
import { editor } from 'monaco-editor';

import styles from './Output.module.css';

interface Props {
  value: string;
}

export default function Output(props: Props): JSX.Element {
  const domRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    if (!domRef.current) {
      return;
    }
    editorRef.current = editor.create(domRef.current, {
      language: 'typescript',
      fontFamily: `'cascadia code', monospace`,
      minimap: {
        enabled: false,
      },
      automaticLayout: true,
      value: props.value,
      placeholder: 'Generated TypeScript interface code will appear here',
      readOnly: true,
    });
  }, []);

  useEffect(() => {
    editorRef.current?.setValue(props.value);
  }, [props.value]);

  return <div className={styles.output} ref={domRef}></div>;
}
