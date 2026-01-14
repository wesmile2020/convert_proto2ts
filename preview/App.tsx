import { useState, type JSX } from 'react';
import { Layout, Splitter, Drawer, Badge, Button } from 'antd';
import { version } from '@/index';
import Editor, { type CompilerError } from './components/Editor';
import Output from './components/Output';

import styles from './App.module.css';

export default function App(): JSX.Element {
  const [output, setOutput] = useState<string>('');
  const [errors, setErrors] = useState<CompilerError[]>([]);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);

  function handleCloseDrawer() {
    setDrawerVisible(false);
  }

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <div className={styles.title}>Convert Proto2ts@{version}</div>
        {errors.length > 0 && (
          <Badge count={errors.length}>
            <Button onClick={() => setDrawerVisible(true)} variant="text" color="danger">
              Compile Error
            </Button>
          </Badge>
        )}
      </Layout.Header>
      <Layout.Content className={styles.content}>
        <Splitter>
          <Splitter.Panel>
            <Editor onCompile={setOutput} onError={setErrors} />
          </Splitter.Panel>
          <Splitter.Panel>
            <Output value={output} />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
      {
        <Drawer
          title="Compile Errors"
          open={drawerVisible}
          closable
          onClose={handleCloseDrawer}
          placement="bottom"
        >
          <ul className={styles.errors}>
            {errors.map((error, idx) => (
              <li key={idx} className={styles.error_item}>
                Error on line{' '}
                <span className={styles.position}>
                  {error.position.line}:{error.position.column}
                </span>
                <span className={styles.message}>{error.message}</span>
              </li>
            ))}
          </ul>
        </Drawer>
      }
    </Layout>
  );
}
