/**
 * BleService Context
 * 提供依赖注入，支持单元测试 Mock
 */
import React, {createContext, useContext, useMemo, ReactNode} from 'react';
import type {IBleService} from '../interfaces';
import BleServiceInstance from '../services/BleService';

// ==================== Context 定义 ====================

const BleContext = createContext<IBleService | null>(null);

// ==================== Provider Props ====================

interface BleProviderProps {
  children: ReactNode;
  /** 可选的自定义服务实例（用于测试） */
  service?: IBleService;
}

// ==================== Provider 组件 ====================

export const BleProvider: React.FC<BleProviderProps> = ({
  children,
  service,
}) => {
  // 使用传入的服务实例或默认单例
  const bleService = useMemo(() => {
    return service || BleServiceInstance;
  }, [service]);

  return (
    <BleContext.Provider value={bleService}>
      {children}
    </BleContext.Provider>
  );
};

// ==================== Hook ====================

/**
 * 使用 BleService 的 Hook
 * @throws 如果在 BleProvider 外部使用会抛出错误
 */
export const useBleService = (): IBleService => {
  const context = useContext(BleContext);

  if (!context) {
    throw new Error('useBleService must be used within a BleProvider');
  }

  return context;
};

// ==================== 导出 ====================

export {BleContext};
export default BleProvider;
