/**
 * 设备展示页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/devicesConfig.ts 控制。
 */
import type { DeviceItem } from "@/types/devicesConfig";

export const devicesData: DeviceItem[] = [];

/** 获取所有设备数据列表 */
export function getDevicesList(): DeviceItem[] {
	return devicesData;
}
