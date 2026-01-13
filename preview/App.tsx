import { useState, type JSX } from 'react';
import { Layout, Splitter, Typography } from 'antd';
import { version } from '@/index';
import Editor from './components/Editor';
import Output from './components/Output';

import styles from './App.module.css';

export default function App(): JSX.Element {
  const [output, setOutput] = useState<string>('');

  return (
    <Layout className={styles.layout}>
      <Layout.Header className={styles.header}>
        <Typography.Title level={5}
          className={styles.title}>
          Convert Proto2TS@{version}
        </Typography.Title>
      </Layout.Header>
      <Layout.Content className={styles.content}>
        <Splitter>
          <Splitter.Panel>
            <Editor onCompile={setOutput}/>
          </Splitter.Panel>
          <Splitter.Panel>
            <Output value={output} />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
    </Layout>
  );
}
