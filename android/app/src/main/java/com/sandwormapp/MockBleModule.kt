package com.sandwormapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Mock BLE 模块 - 用于开发测试
 * 接收 ADB 广播，模拟蓝牙数据
 */
class MockBleModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "MockBleModule"
        const val ACTION_MOCK_BLE = "com.sandwormapp.MOCK_BLE"
        const val EXTRA_DATA = "data"
        const val EVENT_MOCK_DATA = "onMockBleData"
        private const val TAG = "MockBleModule"
    }

    private var isEnabled = false
    private var receiver: BroadcastReceiver? = null

    override fun getName(): String = NAME

    /**
     * 启用 Mock 模式
     */
    @ReactMethod
    fun enable() {
        if (isEnabled) return
        
        Log.d(TAG, "启用 Mock BLE 模式")
        
        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val data = intent?.getStringExtra(EXTRA_DATA)
                if (data != null) {
                    Log.d(TAG, "收到 Mock 数据: $data")
                    sendEvent(data)
                }
            }
        }

        val filter = IntentFilter(ACTION_MOCK_BLE)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactApplicationContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactApplicationContext.registerReceiver(receiver, filter)
        }
        
        isEnabled = true
    }

    /**
     * 禁用 Mock 模式
     */
    @ReactMethod
    fun disable() {
        if (!isEnabled) return
        
        Log.d(TAG, "禁用 Mock BLE 模式")
        
        receiver?.let {
            try {
                reactApplicationContext.unregisterReceiver(it)
            } catch (e: Exception) {
                Log.e(TAG, "取消注册接收器失败: ${e.message}")
            }
        }
        receiver = null
        isEnabled = false
    }

    /**
     * 获取当前状态
     */
    @ReactMethod
    fun isEnabled(promise: Promise) {
        promise.resolve(isEnabled)
    }

    /**
     * 发送事件到 JS 层
     */
    private fun sendEvent(data: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_MOCK_DATA, data)
    }

    /**
     * 添加事件监听器（React Native 要求）
     */
    @ReactMethod
    fun addListener(eventName: String) {
        // 保持与 JS 的兼容性
    }

    /**
     * 移除事件监听器（React Native 要求）
     */
    @ReactMethod
    fun removeListeners(count: Int) {
        // 保持与 JS 的兼容性
    }
}
