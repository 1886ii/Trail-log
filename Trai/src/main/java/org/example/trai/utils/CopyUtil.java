package org.example.trai.utils;

import java.lang.reflect.Field;

public class CopyUtil {

    /**
     * 将source对象同名字段拷贝到targetClass的新实例
     * @param source 源对象
     * @param targetClass 目标类class
     * @return 目标对象实例
     */
    public static <T> T copy(Object source, Class<T> targetClass) {
        if (source == null) {
            return null;
        }
        T target;
        try {
            // 无参构造实例化目标对象
            target = targetClass.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            throw new RuntimeException("目标类必须有无参构造方法！", e);
        }
        // 拷贝字段
        copyField(source, target);
        return target;
    }

    /**
     * 内部：同名字段赋值
     */
    private static void copyField(Object source, Object target) {
        Class<?> sourceClazz = source.getClass();
        Class<?> targetClazz = target.getClass();

        // 获取目标所有字段（包括私有）
        Field[] targetFields = targetClazz.getDeclaredFields();
        for (Field targetField : targetFields) {
            String fieldName = targetField.getName();
            try {
                // 在源对象找同名字段
                Field sourceField = sourceClazz.getDeclaredField(fieldName);
                sourceField.setAccessible(true);
                targetField.setAccessible(true);

                // 拿到源值
                Object value = sourceField.get(source);
                // 类型相同才赋值，类型不一样跳过
                if (sourceField.getType().equals(targetField.getType())) {
                    targetField.set(target, value);
                }
            } catch (NoSuchFieldException e) {
                // 源对象没有这个字段 → 跳过，不处理
            } catch (Exception e) {
                throw new RuntimeException("字段【" + fieldName + "】赋值失败", e);
            }
        }
    }

}

