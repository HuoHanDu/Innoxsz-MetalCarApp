/**
 * 组合 Provider
 * 便于在 App.tsx 中一次性包裹所有 Context
 */
import React, {ReactNode} from 'react';
import {BleProvider} from './BleContext';
import {PathPlannerProvider} from './PathPlannerContext';
import type {IBleService, IPathPlanner} from '../interfaces';

interface ServiceProviderProps {
  children: ReactNode;
  /** 可选的自定义 BleService 实例（用于测试） */
  bleService?: IBleService;
  /** 可选的自定义 PathPlanner 实例（用于测试） */
  pathPlannerService?: IPathPlanner;
}

/**
 * 组合所有服务 Provider
 * 在测试中可以传入 Mock 实例
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({
  children,
  bleService,
  pathPlannerService,
}) => {
  return (
    <BleProvider service={bleService}>
      <PathPlannerProvider service={pathPlannerService}>
        {children}
      </PathPlannerProvider>
    </BleProvider>
  );
};

export default ServiceProvider;
