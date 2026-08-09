package com.mymangareader.core.database

interface DbStatusProvider {
    fun getVersion(): Int
    fun isOpen(): Boolean
}
