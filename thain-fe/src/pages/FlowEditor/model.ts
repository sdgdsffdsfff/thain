/*
 * Copyright (c) 2019, Xiaomi, Inc.  All rights reserved.
 * This source code is licensed under the Apache License Version 2.0, which
 * can be found in the LICENSE file in the root directory of this source tree.
 */
/**
 * flowExecution list 的model
 */

import { Reducer } from 'redux';
import Editor from '@/pages/FlowEditor/editor';
import { Effect } from 'dva';
import { getComponentDefines, getFlow } from '@/pages/FlowEditor/service';
import { EditorFlowEntity } from '@/pages/FlowEditor/EditorFlowEntity';
import { FlowAllInfo } from '@/commonModels/FlowAllInfo';
import { ComponentDefine } from '../Editor/ComponentDefine';

export class SelectedModel {
  category = '';
  id: number | string = '';
  label = '';
  attributes: any;
  callbackUrl = '';
  condition = '';
}

/**
 * flow 全局参数
 */
export interface FlowAttributes {
  name: string;
  cron?: string;
  callbackUrl?: string;
  callbackEmail?: string;
  slaDuration?: number;
  slaEmail?: string;
  slaKill?: boolean;
  retryNumber?: number;
  retryTimeInterval?: number;
}

export class FlowEditorModelState {
  editor?: Editor;
  flowId = 0;
  selectedModel = new SelectedModel();
  updateGraph?: (key: string, value: string, updateAttributes?: boolean) => void;
  flowAttributes: FlowAttributes = { name: '' };
  componentDefines?: ComponentDefine[];
}

function getUpdateGraph(editor: Editor) {
  return (key: string, value: string, updateAttributes?: boolean) => {
    editor.executeCommand(() => {
      const page = editor.getCurrentPage();
      const selectedItems = page.getSelected();
      selectedItems.forEach((item: any) => {
        const updateModel: any = {};
        if (updateAttributes) {
          updateModel.attributes = { ...item.model.attributes, [key]: value };
        } else {
          updateModel[key] = value;
        }
        page.update(item, updateModel);
      });
    });
  };
}

interface FlowEditorModelType {
  namespace: 'flowEditor';
  state: FlowEditorModelState;
  effects: {
    mount: Effect;
    loadPage: Effect;
    changeFlowAttributes: Effect;
    changeSelectedModel: Effect;
  };
  reducers: {
    updateState: Reducer<FlowEditorModelState>;
    unmount: Reducer<FlowEditorModelState>;
  };
}

const FlowEditorModel: FlowEditorModelType = {
  namespace: 'flowEditor',

  state: new FlowEditorModelState(),

  effects: {
    *mount({ payload: { flowId } }, { call, put }) {
      const editor = new Editor();
      const componentDefines = yield call(getComponentDefines);
      yield put({
        type: 'updateState',
        payload: { flowId, componentDefines, editor, updateGraph: getUpdateGraph(editor) },
      });
    },

    *changeSelectedModel({ payload: { selectedModel }, callback }, { put }) {
      yield put({
        type: 'updateState',
        payload: { selectedModel },
      });
      if (callback) callback();
    },

    /**
     * 需要保证page加载成功
     */
    *loadPage({ payload: { flowId, page } }, { call, put }) {
      const flowAllInfo: FlowAllInfo | undefined = yield call(getFlow, flowId);
      if (flowAllInfo === undefined) {
        return;
      }
      const editorFlowEntity: EditorFlowEntity = EditorFlowEntity.getInstance(flowAllInfo);
      if (editorFlowEntity === undefined) {
        return;
      }
      const nodes = editorFlowEntity.editorNodes;
      const edges = editorFlowEntity.editorEdges;
      const flowAttributes = editorFlowEntity.getAttributes();
      page.read({ nodes, edges });
      yield put({
        type: 'updateState',
        payload: { flowAttributes },
      });
    },

    *changeFlowAttributes({ payload, callback }, { put, select }) {
      const flowAttributes = yield select((state: any) => state.flowEditor.flowAttributes);
      yield put({
        type: 'updateState',
        payload: {
          flowAttributes: {
            ...flowAttributes,
            ...payload,
          },
        },
      });
      if (callback) callback();
    },
  },

  reducers: {
    updateState(state, action) {
      return {
        ...state,
        ...action.payload,
      };
    },
    unmount() {
      return new FlowEditorModelState();
    },
  },
};

export default FlowEditorModel;
