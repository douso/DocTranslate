<template>
    <el-tooltip placement="top" v-if="content">
        <template #content>
            <div class="tooltip-container" v-html="content"></div>
        </template>
        <div class="shenglue shenglue3" v-html="content"></div>
    </el-tooltip>
</template>

<script setup lang="ts">
defineProps({
    content: String,
})
</script>