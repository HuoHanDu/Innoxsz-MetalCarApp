/**
 * PathPlanner Context
 * 提供依赖注入，支持单元测试 Mock
 */
import React, {createContext, useContext, useMemo, ReactNode} from 'react';
import type {IPathPlanner} from '../interfaces';
import PathPlannerInstance from '../services/PathPlanner';

// ==================== Context 定义 ====================

const PathPlannerContext = createContext<IPathPlanner | null>(null);

// ==================== Provider Props ====================

interface PathPlannerProviderProps {
  children: ReactNode;
  /** 可选的自定义服务实例（用于测试） */
  service?: IPathPlanner;
}

// ==================== Provider 组件 ====================

export const PathPlannerProvider: React.FC<PathPlannerProviderProps> = ({
  children,
  service,
}) => {
  // 使用传入的服务实例或默认单例
  const pathPlanner = useMemo(() => {
    return service || PathPlannerInstance;
  }, [service]);

  return (
    <PathPlannerContext.Provider value={pathPlanner}>
      {children}
    </PathPlannerContext.Provider>
  );
};

// ==================== Hook ====================

/**
 * 使用 PathPlanner 的 Hook
 * @throws 如果在 PathPlannerProvider 外部使用会抛出错误
 */
export const usePathPlanner = (): IPathPlanner => {
  const context = useContext(PathPlannerContext);

  if (!context) {
    throw new Error('usePathPlanner must be used within a PathPlannerProvider');
  }

  return context;
};

// ==================== 导出 ====================

export {PathPlannerContext};
export default PathPlannerProvider;
